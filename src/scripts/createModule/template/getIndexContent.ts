export const getIndexContent = (moduleName: string, CapName: string) => `
import express from "express";
import ${moduleName}Routes from "./${moduleName}.routes";
import ${CapName} from "./${moduleName}.model";
import * as ${moduleName}Controller from "./${moduleName}.controller";
import * as ${moduleName}Validation from "./${moduleName}.validation";

const router = express.Router();
router.use("/", ${moduleName}Routes);

export {
  ${CapName},
  ${moduleName}Controller,
  ${moduleName}Validation
};

export default router;
`;
