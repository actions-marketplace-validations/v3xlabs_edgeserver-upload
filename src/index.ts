import { createLogger } from "@lvksh/logger";
import chalk from "chalk";
import * as core from "@actions/core";
import * as yup from "yup";
import readline from "readline";

chalk.level = 1;
process.env.FORCE_COLOR = "1";

const clearLastLine = () => {
    readline.moveCursor(process.stdout, 0, -1); // up one line
    readline.clearLine(process.stdout, 1); // from cursor to end
};

const validateConfiguration = yup
    .object({
        server: yup
            .string()
            .required("Please specify a server")
            .url("Not a URL"),
        app_id: yup
            .string()
            .min(
                1,
                "Please specify an app_id, you find this on your apps page.",
            )
            .matches(
                /^(?!([0-9.]+[eE]]\+[0-9]+))[0-9]+$/,
                "Invalid app_id, try adding quotes around it.",
            )
            .matches(/[0-9]+/m, "Invalid app_id, make it a number"),
        token: yup
            .string()
            .required("Please specify a token, see /keys for more"),
        directory: yup
            .string()
            .required("Please specify a directory such as `dist`"),
    })
    .required();

const log = createLogger(
    {
        "🚀": "🚀",
        "⚙️": "⚙️ ",
        "🔧": "🔧",
        "🌿": "🌿",
        "💨": "💨",
        "⭐": "⭐",
        empty: {
            label: "  ",
        },
    },
    {
        divider: " ",
        newLine: "  ",
        newLineEnd: "  ",
        padding: "NONE",
    },
);

const version = require("../package.json")["version"];

(async () => {
    log.empty("", "");

    log["⭐"](chalk.magenta`edgeserver upload` + " action v" + version);
    log.empty(chalk.yellowBright("-".repeat(40)));
    log.empty(
        "Authored by " + chalk.gray`@lvksh`,
        "github.com/lvksh/edgeserver-upload",
        "",
    );

    await new Promise<void>((reply) => setTimeout(reply, 1000));

    log["🌿"]("Relaxing....");
    log.empty(chalk.yellowBright("-".repeat(40)));

    // Install dependencies
    // log.empty('');
    // log['🔧']('Building...');
    // log.empty(chalk.yellowBright('-'.repeat(40)));

    // log.empty('Switching to ' + chalk.gray(global));

    log.empty();
    log["⚙️"]("Configuration");
    log.empty(chalk.yellowBright("-".repeat(40)));

    log.empty("Loading...");

    const config = {
        server: core.getInput("server"),
        app_id: core.getInput("app_id").toString(),
        token: core.getInput("token"),
        directory: core.getInput("directory"),
    };

    clearLastLine();

    try {
        validateConfiguration.validateSync(config, { abortEarly: true });
    } catch (error) {
        if (error instanceof yup.ValidationError) {
            log.empty(
                "Error Validating " + chalk.yellowBright(error.path),
                "\t" + chalk.white(chalk.bgCyanBright(` ${error.errors[0]} `)),
            );
        }
        return;
    }

    log.empty("Server: " + chalk.gray(config.server));
    log.empty("App ID: " + chalk.gray(config.app_id));
    log.empty("Directory: " + chalk.yellowBright(config.directory));
    log.empty(
        "Token: " + chalk.gray("*".repeat(4) + ` [${config.token.length}]`),
    );

    log.empty("");
    log["🚀"]("Deploying");
    log.empty(chalk.yellowBright("-".repeat(40)));
    log.empty("");
    log.empty(chalk.white(`[${chalk.greenBright("\u2588".repeat(32))}]`));

    log.empty("", "");
})();
