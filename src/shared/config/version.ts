import packageJson from "../../../package.json";

/** Version embedded from package.json at frontend build time. */
export const APP_VERSION = packageJson.version;
