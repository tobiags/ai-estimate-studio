import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

export default withMermaid(
  defineConfig({
    base: "/ai-estimate-studio/",
    cleanUrls: true,
    description: "Product and engineering source of truth for AI Estimate Studio.",
    lastUpdated: true,
    title: "AI Estimate Studio",
    vite: {
      build: {
        chunkSizeWarningLimit: 1500,
      },
    },
    themeConfig: {
      nav: [
        { text: "Product", link: "/product/PRODUCT_SPEC" },
        { text: "Architecture", link: "/architecture/SYSTEM_ARCHITECTURE" },
        { text: "API", link: "/api/API" },
        { text: "Roadmap", link: "/roadmap/IMPLEMENTATION_ROADMAP" },
      ],
      sidebar: [
        {
          text: "Product and UX",
          items: [
            { text: "Product specification", link: "/product/PRODUCT_SPEC" },
            { text: "UX specification", link: "/ux/UX_SPEC" },
          ],
        },
        {
          text: "Architecture",
          items: [
            { text: "System architecture", link: "/architecture/SYSTEM_ARCHITECTURE" },
            { text: "C4 model", link: "/architecture/C4" },
            { text: "Repository structure", link: "/architecture/REPOSITORY_STRUCTURE" },
            { text: "Sequences", link: "/architecture/SEQUENCES" },
            { text: "Decision records", link: "/architecture/adr/" },
          ],
        },
        {
          text: "Subsystems",
          items: [
            { text: "Object Viewer", link: "/viewer/OBJECT_VIEWER" },
            { text: "Data model", link: "/data/DATA_MODEL" },
            { text: "Prisma schema", link: "/data/PRISMA_SCHEMA" },
            { text: "Pricing", link: "/pricing/PRICING_SPEC" },
            { text: "AI", link: "/ai/AI_SYSTEM" },
            { text: "Administration", link: "/admin/ADMIN_SPEC" },
            { text: "API", link: "/api/API" },
          ],
        },
        {
          text: "Delivery",
          items: [
            { text: "Deployment", link: "/deployment/DEPLOYMENT" },
            { text: "Quality", link: "/quality/QUALITY_STRATEGY" },
            { text: "Security and privacy", link: "/quality/SECURITY_PRIVACY" },
            { text: "Git workflow", link: "/git/GIT_WORKFLOW" },
            { text: "Implementation roadmap", link: "/roadmap/IMPLEMENTATION_ROADMAP" },
          ],
        },
      ],
      socialLinks: [
        { icon: "github", link: "https://github.com/tobiags/ai-estimate-studio" },
      ],
    },
  }),
);
