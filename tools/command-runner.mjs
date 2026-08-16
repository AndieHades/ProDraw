import { spawn } from "node:child_process";

export function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

export async function runNpmScripts(scripts) {
  const npmCli = process.env.npm_execpath;
  for (const script of scripts) {
    if (npmCli) await run(process.execPath, [npmCli, "run", script]);
    else await run("npm", ["run", script]);
  }
}
