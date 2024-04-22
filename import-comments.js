const csv = require("csv");
const fs = require("fs");

const { createIssueComment } = require("./helpers.js");

const importCommentsFile = (octokit, file, values) => {
  fs.readFile(file, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading file.");
      process.exit(1);
    }
    csv.parse(
      data,
      {
        trim: true,
        bom: true,
        delimiter: values.csvDelimiter,
      },
      (err, csvRows) => {
        if (err) throw err;
        const cols = csvRows[0].map((col) => col.toLowerCase());
        csvRows.shift();

        // get indexes of the fields we need
        const numberIndex = cols.indexOf("number");
        const commentIndex = cols.indexOf("comment");

        if (numberIndex === -1) {
          console.error("Issue number required by GitHub, but not found in CSV.");
          process.exit(1);
        }
        if (commentIndex === -1) {
          console.error("Comments not found in CSV.");
          process.exit(1);
        }
        const createPromises = csvRows.map((row) => {
          const sendObj = {
            owner: values.userOrOrganization,
            repo: values.repo,
            issue_number: row[numberIndex],
            headers: {
              'X-GitHub-Api-Version': '2022-11-28',
            },
          };

          // if we have a body column, pass that.
          if (commentIndex > -1 && row[commentIndex] !== "") {
            sendObj.body = row[commentIndex];
          }

          return createIssueComment(
            octokit,
            sendObj,
            values.userOrOrganization,
            values.repo,
            row[numberIndex]
          );
        });

        Promise.all(createPromises).then(
          (res) => {
            const successes = res.filter((cr) => {
              return (
                cr.status === 200 || cr.status === 201 || cr.status === 202
              );
            });
            const fails = res.filter((cr) => {
              return (
                cr.status !== 200 && cr.status !== 201 && cr.status !== 202
              );
            });

            console.log(
              `Created ${successes.length} issue comments, and had ${fails.length} failures.`
            );
            console.log(
              "❤ ❗ If this project has provided you value, please ⭐ star the repo to show your support: ➡ https://github.com/gavinr/github-csv-tools"
            );

            if (fails.length > 0) {
              console.error("ERROR - some of the comment imports have failed");
              console.log(fails);
            }

            process.exit(0);
          },
          (err) => {
            console.error("Error");
            console.error(err);
            process.exit(0);
          }
        );
      }
    );
  });
};

module.exports = { importCommentsFile };
