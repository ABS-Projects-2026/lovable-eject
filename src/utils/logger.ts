import chalk from "chalk";
import ora, { type Ora } from "ora";

export const log = {
  info: (msg: string) => console.log(chalk.blue("ℹ"), msg),
  success: (msg: string) => console.log(chalk.green("✔"), msg),
  warn: (msg: string) => console.log(chalk.yellow("⚠"), msg),
  error: (msg: string) => console.error(chalk.red("✖"), msg),
  heading: (msg: string) => console.log(chalk.bold.underline(`\n${msg}\n`)),
  dim: (msg: string) => console.log(chalk.dim(msg)),
  table: (label: string, value: string | number) =>
    console.log(`  ${chalk.gray(label.padEnd(28))} ${value}`),
};

export function spinner(text: string): Ora {
  return ora({ text, color: "cyan" }).start();
}
