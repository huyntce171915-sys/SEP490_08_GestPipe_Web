const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const parseTrainingSummary = (resultsDir) => {
  const summaryPath = path.join(resultsDir, 'optimal_hyperparameters_per_pose.csv');
  if (!fs.existsSync(summaryPath)) {
    return null;
  }

  const csvBuffer = fs.readFileSync(summaryPath);
  const records = parse(csvBuffer, {
    columns: true,
    skip_empty_lines: true,
  });

  if (!records.length) {
    return null;
  }

  const numeric = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const summary = {
    averageCvF1: undefined,
    averageTestF1: undefined,
    bestHyperparams: [],
  };

  let cvSum = 0;
  let testSum = 0;

  records.forEach((row) => {
    const cvF1 = numeric(row.cv_f1_score);
    const testF1 = numeric(row.test_f1_score);
    if (typeof cvF1 === 'number') {
      cvSum += cvF1;
    }
    if (typeof testF1 === 'number') {
      testSum += testF1;
    }

    summary.bestHyperparams.push({
      pose_label: row.pose_label,
      best_kernel: row.best_kernel,
      best_C: numeric(row.best_C),
      best_gamma: row.best_gamma,
      test_f1_score: testF1,
    });
  });

  summary.averageCvF1 = cvSum / records.length;
  summary.averageTestF1 = testSum / records.length;
  summary.summaryPath = summaryPath;

  return summary;
};

module.exports = parseTrainingSummary;
