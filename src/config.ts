const args = process.argv.slice(2);

export const config = {
  ignoreRobotsTxt: args.includes("--ignore-robots-txt"),
  failOnRobotsTxtUnavailable: !args.includes("--allow-unknown-robots"),
};
