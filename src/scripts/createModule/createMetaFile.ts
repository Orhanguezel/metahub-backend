import fs from "fs";
import path from "path";
import { getGitUser, getGitCommitHash } from "../generateMeta/utils/gitHelpers";
import { updateMetaVersionLog } from "../generateMeta/utils/versionHelpers";

export const createMetaFile = async (moduleName: string, metaDir: string, options?: { useAnalytics?: boolean }) => {
  const username = await getGitUser();
  const commitHash = await getGitCommitHash();
  const now = new Date().toISOString();

  const baseMeta = {
    name: moduleName,
    icon: "box",
    visibleInSidebar: true,
    useAnalytics: options?.useAnalytics ?? false,
    enabled: true,
    roles: ["admin"],
    language: "en",
    routes: [],
    updatedBy: { username, commitHash },
    lastUpdatedAt: now,
    history: [],
    showInDashboard: true,  
    order: 0,              
    statsKey: "",         
  };

  const metaWithVersion = updateMetaVersionLog(baseMeta);

  fs.writeFileSync(
    path.join(metaDir, `${moduleName}.meta.json`),
    JSON.stringify(metaWithVersion, null, 2)
  );
};
