const createIssue = (octokit, issueInfo, organization, repository) => {
  return new Promise((resolve, reject) => {
    octokit
      .request(
        "POST /repos/" + organization + "/" + repository + "/issues",
        issueInfo
      )
      .then(
        (res) => {
          // console.log("res", res);
          if (res.status === 201) {
            console.log(`Imported issue: ${issueInfo.title}`);
            resolve(res);
          } else {
            // error creating the issue
            reject(res);
          }
        },
        (err) => {
          reject(err);
        }
      );
  });
};

const updateIssue = (octokit, issueInfo, organization, repository, number) => {
  return new Promise((resolve, reject) => {
    octokit
      .request(
        "PATCH /repos/" + organization + "/" + repository + "/issues/" + number,
        issueInfo
      )
      .then(
        (res) => {
          // console.log("res", res);
          if (res.status === 200) {
            console.log(`Updated issue: ${issueInfo.title}`);
            resolve(res);
          } else {
            // error creating the issue
            reject(res);
          }
        },
        (err) => {
          reject(err);
        }
      );
  });
};

module.exports = { createIssue, updateIssue };
