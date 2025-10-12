import { Router } from "express";
import { listSitemapUrls, getSitemapXmlSingle, getSitemapXmlPage, getSitemapIndexXml } from "./controllers/sitemap";
import { robotsTxt } from "./controllers/robots";

const router = Router();

// JSON (debug/health)
router.get("/sitemap-urls", listSitemapUrls);

// XML endpointleri
router.get("/sitemap.xml", getSitemapXmlSingle);
router.get("/sitemap-index.xml", getSitemapIndexXml);
router.get(/^\/sitemap-(\d+)\.xml$/, getSitemapXmlPage);

// robots.txt
router.get("/robots.txt", robotsTxt);

export default router;
