export interface UpdateOption {
  /**
   * Optional headers to include with the update request.
   * Typically used for authentication or custom metadata.
   */
  headers?: Record<string, string>;

  /**
   * Callback to track download progress.
   * @param received - Number of bytes received.
   * @param total - Total number of bytes to be downloaded.
   */
  progress?(received: string, total: string): void;

  /**
   * Callback triggered when the update succeeds.
   */
  updateSuccess?(): void;

  /**
   * Callback triggered when the update fails.
   * @param message - Optional error message or object describing the failure.
   */
  updateFail?(message?: string | Error): void;

  /**
   * Indicates whether the app should restart after installing the update.
   * Default: `false`.
   */
  restartAfterInstall?: boolean;

  /**
   * Custom extension for the bundle file, if applicable.
   * For example: '.jsbundle'.
   */
  extensionBundle?: string;

  /**
   * Metadata for the update.
   * Can contain information such as version details, description, etc.
   */
  metadata?: any
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
  /**
   * Optional callback when pull success, should handle for case update.
   */
  onPullSuccess?(): void;
  /**
   * Optional callback when pull failed.
   */
  onPullFailed?(msg: string): void;
  /**
   * Optional callback when clone success, handle it in the first time clone.
   */
  onCloneSuccess?(): void;
  /**
   * Optional callback when clone failed.
   */
  onCloneFailed?(msg: string): void;
  /**
   * The bundle path of the Git repository, it should place at root.
   * Eg: the folder name is git_hot_update, bundle file place at git_hot_update/output/main.jsbundle, so bundlePath should be: "output/main.jsbundle".
   */
  bundlePath: string;
  /**
   * Optional restart app after clone / pull success for apply the new bundle.
   */
  restartAfterInstall?: boolean;
  /**
   * Optional when all process success, use for set loading false.
   */
  onFinishProgress?(): void;
}

export interface CloneOption {
  /**
   * The Git repository URL to be cloned.
   * Example: "https://github.com/user/repo.git".
   */
  url: string;

  /**
   * Optional name of the folder where the repository will be cloned.
   * If not provided, the repository name git_hot_update will be used.
   */
  folderName?: string;

  /**
   * Callback to track the progress of the cloning process.
   * @param received - Number of bytes received so far.
   * @param total - Total number of bytes to be downloaded.
   */
  onProgress?(received: number, total: number): void;

  /**
   * The branch to be checked out after cloning.
   * Defaults to the repository's default branch if not specified.
   */
  branch?: string;

  /**
   * The bundle path of the Git repository, it should place at root.
   * Eg: the folder name is git_hot_update, bundle file place at git_hot_update/output/main.jsbundle, so bundlePath should be: "output/main.jsbundle".
   */
  bundlePath: string;

  /**
   * Optional username to set up the Git user configuration.
   * Used for operations like committing or signing, not for authentication.
   * Example: "John Doe".
   */
  userName?: string;

  /**
   * Optional email to set up the Git user configuration.
   * Used for operations like committing or signing, not for authentication.
   * Example: "john.doe@example.com".
   */
  email?: string;
}

export interface PullOption {
  /**
   * Optional name of the folder containing the Git repository to pull from.
   * Defaults to the current directory if not specified.
   */
  folderName?: string;

  /**
   * Callback to track the progress of the pull operation.
   * @param received - Number of bytes received so far.
   * @param total - Total number of bytes to be downloaded.
   */
  onProgress?(received: number, total: number): void;

  /**
   * The name of the branch to pull updates from.
   * This branch must exist in the remote repository.
   */
  branch: string;
}
