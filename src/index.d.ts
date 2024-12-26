import type { DownloadManager } from './download';
import type { UpdateGitOption, UpdateOption } from './type';

export interface GitModule {
  checkForGitUpdate(options: UpdateGitOption): Promise<void>;
  removeGitUpdate(folder?: string): void;
  getBranchName(): Promise<string | null>;
  pullUpdate(options: {
    branch: string;
    folderName?: string;
    onProgress?: (received: number, total: number) => void;
  }): Promise<{ success: boolean; msg?: string }>;
  cloneRepo(options: {
    url: string;
    branch?: string;
    folderName?: string;
    bundlePath: string;
    onProgress?: (received: number, total: number) => void;
  }): Promise<{ success: boolean; bundle?: string; msg?: string }>;
}

export interface OtaHotUpdate {
  /**
   * Set up the path to the downloaded bundle file.
   * @param path - The path to the bundle file.
   * @param extension - Optional extension for the bundle file.
   */
  setupBundlePath(path: string, extension?: string): Promise<boolean>;

  /**
   * Set up an exact path to the bundle file for the update.
   * @param path - The exact path to the bundle file.
   */
  setupExactBundlePath(path: string): Promise<boolean>;

  /**
   * Remove the current update and optionally restart the app.
   * @param restartAfterRemoved - Whether to restart the app after removing the update.
   */
  removeUpdate(restartAfterRemoved?: boolean): void;

  /**
   * Download a bundle file from a specified URI.
   * @param downloadManager - The download manager instance.
   * @param uri - The URI of the bundle file.
   * @param version - The version of the bundle file.
   * @param option - Additional update options.
   */
  downloadBundleUri(
    downloadManager: DownloadManager,
    uri: string,
    version: number,
    option?: UpdateOption
  ): Promise<void>;

  /**
   * Reset the app by restarting it.
   */
  resetApp(): Promise<void>;

  /**
   * Get the current version of the app.
   */
  getCurrentVersion(): Promise<number>;

  /**
   * Set the current version of the app.
   * @param version - The version to set.
   */
  setCurrentVersion(version: number): Promise<boolean>;

  /**
   * Git-related operations.
   */
  git: GitModule;
}

declare const OtaHotUpdate: OtaHotUpdate;

export default OtaHotUpdate;
