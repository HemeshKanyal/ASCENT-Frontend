// Keep Metro out of the marketing site (its own node_modules, built with Vite).
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const site = path.join(__dirname, "website").replace(/[/\\.]/g, (c) => `\\${c}`);
config.resolver.blockList = [new RegExp(`^${site}(/|\\\\).*`)];

module.exports = config;
