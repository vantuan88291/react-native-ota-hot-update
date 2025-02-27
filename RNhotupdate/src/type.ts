export interface UpdateOption {
  headers?: object;
  progress?(received: string, total: string): void;
  updateSuccess?(): void;
  updateFail?(message?: string): void;
  restartAfterInstall?: boolean;
  extensionBundle?: string;
  metadata?: any;
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
  url: string;
  folderName?: string;
  onProgress?(received: number, total: number): void;
  branch?: string;
  bundlePath: string;
  userName?: string;
  email?: string;
}

export interface PullOption {
  folderName?: string;
  onProgress?(received: number, total: number): void;
  branch: string;
}
