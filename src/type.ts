export interface UpdateOption {
  headers?: object;
  progress?(received: string, total: string): void;
  updateSuccess?(): void;
  updateFail?(message?: string): void;
  restartAfterInstall?: boolean;
  extensionBundle?: string;
}

/**
 * Options for updating a Git repository.
 */
export interface UpdateGitOption {
  /**
   * The URL of the Git repository to check update.
   */
  url: string;

  /**
   * Optional callback to monitor the progress of the update.
   * @param received - The number of bytes received so far.
   * @param total - The total number of bytes to be received.
   */
  onProgress?(received: number, total: number): void;

  /**
   * Optional branch name to update or switch to.
   * If not specified, the default branch will be main.
   */
  branch?: string;

  /**
   * Optional name of the folder where the repository will be cloned or updated.
   * If not specified, a default folder name will be git_hot_update.
   */
  folderName?: string;
}
