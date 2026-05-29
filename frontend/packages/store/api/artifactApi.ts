import { apiClient } from "./client";
import { API_BASE_URL } from "./config";
import type { BackendArtifact, BackendDataResponse } from "./types";

export function getArtifactDownloadUrl(artifactId: string): string {
	return `${API_BASE_URL}/artifacts/${encodeURIComponent(artifactId)}/download`;
}

export const artifactApi = {
	getDownloadUrl: getArtifactDownloadUrl,
	listTaskArtifacts: (taskId: string) =>
		apiClient.get<BackendDataResponse<BackendArtifact[]>>(
			`/tasks/${encodeURIComponent(taskId)}/artifacts`,
		),
};
