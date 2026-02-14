const CHROMIUM_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
].filter(Boolean) as string[];

export function getChromiumCandidates(): string[] {
  return CHROMIUM_CANDIDATES;
}
