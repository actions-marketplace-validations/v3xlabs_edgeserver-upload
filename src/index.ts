import { createLogger } from "@lvksh/logger";
import chalk from "chalk";
import * as core from "@actions/core";
import * as github from '@actions/github';
import * as yup from "yup";
import readline from "readline";
import prettyBytes from "pretty-bytes";
import { logTreeData, treeFolderData } from "./treeFolder";
import { resolve } from "path";
import { stat } from "fs/promises";
import archiver from "archiver";
import { createWriteStream } from "fs";
import fetch, { blobFromSync, FormData } from "node-fetch";

chalk.level = 1;
process.env.FORCE_COLOR = "1";

const QUOTES = [
    "Well hello there",
    "Good morning me lad!",
    "Lets goooooo!!",
    "Visit https://og.ax/ for a good laugh.",
    "Hope you are doing okay 😇",
    "See you on the other side 🎉",
];

const randomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

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
        "📁": "📁",
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
    );

    await new Promise<void>((reply) => setTimeout(reply, 1000));

    log.empty();
    log["🌿"]("Relaxing....");
    log.empty(chalk.yellowBright("-".repeat(40)));
    log.empty(randomQuote());

    log.empty();
    log["🔧"]('Context Data');
    log.empty(chalk.yellowBright('-'.repeat(40)));

    const shouldPushGithubContext = github.context && github.context.sha;
    if (shouldPushGithubContext) {
        log.empty('Loaded github context');
    } else {
        log.empty('No context to be found');
    }

    log.empty();
    log["⚙️"]("Configuration");
    log.empty(chalk.yellowBright("-".repeat(40)));

    const config = {
        server: process.env.EDGE_SERVER || core.getInput("server"),
        app_id: process.env.EDGE_APP_ID || core.getInput("app_id").toString(),
        token: process.env.EDGE_TOKEN || core.getInput("token"),
        directory: process.env.EDGE_DIRECTORY || core.getInput("directory"),
    };

    try {
        validateConfiguration.validateSync(config, { abortEarly: true });
    } catch (error) {
        if (error instanceof yup.ValidationError) {
            log.empty(
                "Error Validating " + chalk.yellowBright(error.path),
                "\t" + chalk.white(chalk.bgCyanBright(` ${error.errors[0]} `)),
            );
        }
        process.exit(1);
        return;
    }

    log.empty("Server: " + chalk.gray(config.server));
    log.empty("App ID: " + chalk.gray(config.app_id));
    log.empty("Directory: " + chalk.yellowBright(config.directory));
    log.empty(
        "Token: " + chalk.gray("*".repeat(4) + ` [${config.token.length}]`),
    );

    log.empty("");
    log["📁"]("Compressing Application");
    log.empty(chalk.yellowBright("-".repeat(40)));

    const sizeData = await treeFolderData(resolve("./", config.directory));

    log.empty("Files Overview:");
    logTreeData(sizeData, console.log);

    log.empty("");

    const writeStrem = createWriteStream(resolve("./", "edgeserver_dist.zip"));
    const zippo = archiver("zip");

    zippo.on("progress", (data) => {
        const percentage = Math.ceil(
            (data.fs.processedBytes / sizeData.size) * 100,
        );
        log.empty("Compressing " + (percentage > 100 ? 100 : percentage) + "%");
    });

    zippo.pipe(writeStrem);
    zippo.directory(resolve("./", config.directory), false);

    await zippo.finalize();

    const compressedData = await stat(resolve("./", "edgeserver_dist.zip"));

    log.empty("");

    log.empty(
        "Compressed to " + chalk.yellowBright(prettyBytes(compressedData.size)),
    );

    log.empty("");
    log["🚀"]("Deploying");
    log.empty(chalk.yellowBright("-".repeat(40)));

    const formData = new FormData();
    formData.set("data", blobFromSync(resolve("./", "edgeserver_dist.zip")));

    const uploadRequest = await fetch(
        config.server + "/deployments/push?site=" + config.app_id,
        {
            method: "PUT",
            headers: {
                Authorization: "Bearer " + config.token,
            },
            body: formData,
        },
    );

    const status = uploadRequest.status;

    if (status != 200) {
        if (status == 403) {
            log.empty(
                chalk.redBright(
                    "Unauthorized.... Check your auth token's validity.",
                ),
            );
        } else {
            log.empty(
                chalk.yellowBright('Unknown error with status code ' + status)
            );
        }
        process.exit(1);
        return;
    }

    await uploadRequest.text();

    log.empty(chalk.greenBright("Successfully Deployed 😊"));
    
    // log.empty(chalk.white(`[${chalk.greenBright("\u2588".repeat(32))}]`));

    log.empty("", "");
})();
