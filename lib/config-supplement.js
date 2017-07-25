/**
 * Config, specifically table names, as they
 * are squishy.
 */


let tables = {
  contestInfo: process.env.TABLE_CONTEST_INFO || 'Contest Info',
  candidateInfo: process.env.TABLE_CANDIDATE_INFO || 'Candidate Info'
};

// Export config
module.exports = {
  tables: tables
};
