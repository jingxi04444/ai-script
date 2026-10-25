#!/usr/bin/env python3.11
"""Launch AIONE after preloading modules affected by its dynamic-import cycle."""

from __future__ import annotations

import inspect
import os
import sys
from pathlib import Path

import all_in_one.cli.main as aione_cli_main
from all_in_one.cli.errors import CLIError, ErrorCategory
from all_in_one.cli.main import _default_upstream_root, main
from all_in_one.platforms import invoke as aione_invoke


def preload_douyin() -> None:
    upstream_root = _default_upstream_root()
    douyin_root = upstream_root / "DouYin_Spider"
    if not douyin_root.is_dir():
        return

    module_path = str(douyin_root.resolve())
    if module_path not in sys.path:
        sys.path.insert(0, module_path)

    # AIONE loads upstream files through a synthetic module name. Without
    # preloading, DouYin_Spider imports builder.auth twice and hits the
    # circular dependency between builder.auth and dy_apis.douyin_api.
    from dy_apis import douyin_api  # noqa: F401
    from builder.auth import DouyinAuth  # noqa: F401


def find_upstream_root() -> Path:
    return _default_upstream_root()


def patch_douyin_auth_builder() -> None:
    """Adapt AIONE 0.1.1 to DouYin_Spider's current auth constructor."""

    def build_douyin_auth(_endpoint, cookie_value: str):
        from builder.auth import DouyinAuth

        auth = DouyinAuth()
        auth.perepare_auth(cookie_value)
        return auth

    aione_invoke._douyin_auth = build_douyin_auth


def patch_xhs_instance_loader() -> None:
    """Build XHS_Apis with the current upstream's required auth instance."""

    default_invoke = aione_invoke.invoke_endpoint

    def invoke_with_xhs_auth(endpoint, arguments, cookie=None, proxy=None, timeout=None):
        if endpoint.platform != "xhs" or endpoint.class_name != "XHS_Apis":
            return default_invoke(endpoint, arguments, cookie, proxy, timeout)
        if cookie is None:
            raise CLIError(
                ErrorCategory.AUTH_MISSING,
                "xhs command requires cookies. Configure them in the admin market source.",
                platform=endpoint.platform,
            )

        repo_root = aione_invoke._repo_root_for(endpoint.source_file)
        module_path = str(repo_root.resolve()) if repo_root else ""
        inserted = bool(module_path and module_path not in sys.path)
        if inserted:
            sys.path.insert(0, module_path)
        try:
            from xhs_utils.xhs_pc import XHSPcAuth

            module = aione_invoke._load_module(endpoint.source_file)
            owner = getattr(module, endpoint.class_name)
            target = getattr(owner(XHSPcAuth.from_cookie(cookie.value)), endpoint.function_name)
            signature = inspect.signature(target)
            kwargs = {}
            for name, parameter in signature.parameters.items():
                if name in {"self", "cls"}:
                    continue
                if name == "proxies":
                    if proxy:
                        kwargs[name] = {"http": proxy, "https": proxy}
                    continue
                if name == "timeout":
                    if timeout is not None:
                        kwargs[name] = timeout
                    continue
                if name in arguments:
                    kwargs[name] = aione_invoke._coerce(arguments[name], parameter)

            saved_cwd = os.getcwd()
            if repo_root:
                os.chdir(repo_root)
            try:
                return target(**kwargs)
            except CLIError:
                raise
            except Exception as exc:
                raise CLIError(
                    ErrorCategory.UPSTREAM_ERROR,
                    f"xhs {endpoint.resource} {endpoint.action}: "
                    f"{type(exc).__name__}: {exc}",
                    platform=endpoint.platform,
                ) from exc
            finally:
                os.chdir(saved_cwd)
        finally:
            if inserted:
                try:
                    sys.path.remove(module_path)
                except ValueError:
                    pass

    aione_invoke.invoke_endpoint = invoke_with_xhs_auth
    aione_cli_main.invoke_endpoint = invoke_with_xhs_auth


def run() -> int:
    preload_douyin()
    patch_douyin_auth_builder()
    patch_xhs_instance_loader()
    return main(upstream_root=find_upstream_root())


if __name__ == "__main__":
    raise SystemExit(run())
