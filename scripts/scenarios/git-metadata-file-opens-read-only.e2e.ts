/// <reference lib="dom" />
// The DOM lib types the functions this scenario runs in the page.
import { expect } from "e2e";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";

import { runPromise, test, WEB } from "./t3.ts";

const FILE = ".git/info/exclude";

test(
  "A file inside .git opens read-only instead of failing every save",
  WEB,
  async ({ t3, app, browser, screen }) => {
    // The file surface renders in a shadow root that locators do not reach.
    const fileSurface = () =>
      browser.evaluate(() => {
        for (const host of document.querySelectorAll("*")) {
          const content = host.shadowRoot?.querySelector<HTMLElement>("[data-content]");
          if (content) return { text: content.textContent, editable: content.isContentEditable };
        }
        return null;
      });

    const project = await t3.project("demo", { "README.md": "Example project" });
    await runPromise(
      Effect.flatMap(FileSystem.FileSystem, (fs) =>
        fs.writeFileString(`${project}/${FILE}`, "# local ignores\n"),
      ),
    );
    // The Files tree hides .git, so a link in a message is how its files get opened.
    const thread = await t3.thread({
      project,
      title: "Local ignores",
      messages: [`See :codex-file-citation{path="${FILE}" line_range_start="1"}`],
    });
    await t3.open(thread);
    // A message sent through the CLI shows collapsed under its sender.
    await screen.getByRole("button", /^Agent See/).tap();
    await screen.getByRole("link", /^exclude/).tap();
    try {
      await expect.poll(fileSurface).toEqual({ text: "# local ignores", editable: false });
    } finally {
      await app.screenshot("git-metadata-file-opened");
    }
  },
);
