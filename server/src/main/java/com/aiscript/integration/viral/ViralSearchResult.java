package com.aiscript.integration.viral;

import java.util.List;
import java.util.Map;

public record ViralSearchResult(
    List<ViralSearchCandidate> candidates,
    int rawCandidateCount,
    int candidateCount,
    int filteredCount,
    Map<String, Integer> rejectedReasons,
    List<Map<String, String>> rejectedSamples,
    List<String> warnings
) {
}
