const csv = require("csv");
const fs = require("fs");
const converter = require("json-2-csv");

const { createIssue, updateIssue } = require("./helpers.js");

const writeFile = async (data, fileName) => {
  return new Promise((resolve, reject) => {
    converter
      .json2csv(data, {
        emptyFieldValue: "",
      })
      .then(
        (csvString) => {
          fs.writeFile(fileName, csvString, "utf8", function (err) {
            if (err) {
              reject(new Error("Error writing the file."));
            } else {
              resolve(fileName);
            }
          });
        },
        () => {
          reject(new Error("Invalid!"));
        }
      );
  });
};

const summary = (successes, fails) => {
  console.log(
    `Created ${successes.length} issues, and had ${fails.length} failures.`
  );
  console.log(
    "❤ ❗ If this project has provided you value, please ⭐ star the repo to show your support: ➡ https://github.com/gavinr/github-csv-tools"
  );

  if (fails.length > 0) {
    console.error("ERROR - some of the imports have failed");
    console.log(fails);
  }

  process.exit(0);
}

const importFile = (octokit, file, values) => {
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
        const titleIndex = cols.indexOf("title");
        const bodyIndex = cols.indexOf("body");
        const labelsIndex = cols.indexOf("labels");
        const milestoneIndex = cols.indexOf("milestone");
        const assigneesIndex = cols.indexOf("assignees");
        const stateIndex = cols.indexOf("state");
        const idIndex = cols.indexOf("id");

        if (titleIndex === -1) {
          console.error("Title required by GitHub, but not found in CSV.");
          process.exit(1);
        }
        const outputMappings = [];
        const createPromises = csvRows.map((row) => {
          const sendObj = {
            owner: values.userOrOrganization,
            repo: values.repo,
            title: row[titleIndex],
            headers: {
              'X-GitHub-Api-Version': '2022-11-28',
            },
          };

          // if we have a body column, pass that.
          if (bodyIndex > -1 && row[bodyIndex] !== "") {
            sendObj.body = row[bodyIndex];
          }

          // if we have a labels column, pass that.
          if (labelsIndex > -1 && row[labelsIndex] !== "") {
            sendObj.labels = row[labelsIndex].split(",");
          }

          // if we have a milestone column, pass that.
          if (milestoneIndex > -1 && row[milestoneIndex] !== "") {
            sendObj.milestone = Number(row[milestoneIndex]);
          }

          // if we have an assignee column, pass that.
          if (assigneesIndex > -1 && row[assigneesIndex] !== "") {
            sendObj.assignees = row[assigneesIndex].split(",");
          }

          return createIssue(
            octokit,
            sendObj,
            values.userOrOrganization,
            values.repo
          ).then((res) => {
            const id = idIndex > -1 && row[idIndex] !== "" ? row[idIndex] : row[titleIndex];
            outputMappings.push({ id, number: res.data.number });
            if (stateIndex > -1 && row[stateIndex].toLowerCase() === "closed") {
              sendObj.state = 'closed';
  
              return updateIssue(
                octokit,
                sendObj,
                values.userOrOrganization,
                values.repo,
                res.data.number);
            }
            return res;
          });
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

            if (outputMappings.length > 0 && values.output) {
              writeFile(outputMappings, values.output).then(
                (fileName) => {
                  console.log(`Import mappings saved successfully! check ${fileName}`);
                  summary(successes, fails);
                },
                (err) => {
                  console.error("Error writing the output file.");
                  console.error(err);
                  summary(successes, fails);
                }
              );
            }
            else {
              summary(successes, fails);
            }
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

module.exports = { importFile };
