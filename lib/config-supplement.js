/**
 * Since there are not hard ID's for tables and fields names
 */

// Dependencies
require('dotenv').load();

// Main export
module.exports = {
  tables: {
    contests: process.env.TABLE_CONTEST_INFO || 'Contest Info',
    results: process.env.TABLE_RESULTS || 'Results'
  },
  translations: {
    contests: {
      'Title': 'office',
      'Area': 'area',
      // 'Seats':
      // 'Ranked-choice'
      'Question': 'questionText',
      'Contest Note': 'note',
      'Called': 'called'
    },
    results: {
      'Candidate Name': 'candidate.display',
      'Candidate Sort Name': 'candidate.sort',
      'Votes': 'votes',
      'Notes': 'note',
      'Winner': 'winner'
    }
  }
};
