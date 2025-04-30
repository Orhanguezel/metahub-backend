import fs from "fs";
import path from "path";
import { getGitUser, getGitCommitHash } from "@/scripts/generateMeta/utils/gitHelpers";
import { updateMetaVersionLog } from "@/scripts/generateMeta/utils/versionHelpers";

export const createMetaFile = async (moduleName: string, metaDir: string) => {
  const username = await getGitUser();
  const commitHash = await getGitCommitHash();
  const now = new Date().toISOString();

  const baseMeta = {
    name: moduleName,
    icon: "box",
    visibleInSidebar: true,
    enabled: true,
    roles: ["admin"],
    useAnalytics: false,
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
