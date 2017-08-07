/**
 * Test Meta class
 */

// Implicit depedences
/* global describe, test, expect */

// To test
const Meta = require('../lib/meta.js');

// Constructor
describe('lib/meta | constructor', () => {
  let contest = (...args) => {
    return new Meta(...args);
  };
  let shouldThrow = (...args) => {
    return () => { return contest(...args); };
  };

  test('throw error for bad input', () => {
    expect(shouldThrow(1, undefined, { noValidate: true })).toThrow(/provided/);
    expect(shouldThrow(1.0, undefined, { noValidate: true })).toThrow(/provided/);
    expect(shouldThrow(true, undefined, { noValidate: true })).toThrow(/provided/);
    expect(shouldThrow([], undefined, { noValidate: true })).toThrow(/provided/);
  });

  test('parses questions', () => {
    let questions = [
      '69;1131;17000;;CITY QUESTION 1 (Duluth);NON BINDING PROPOSITION – SALE OF INTOXICATING LIQUOR IN LAKESIDE AND LESTER PARK NEIGHBORHOODS;Should the state statute which prohibits the issuance of licenses for the sale of intoxicating liquor in the Lakeside and Lester Park neighborhoods be repealed?    A "YES" vote means I support eliminating the state law which prohibits the sale of intoxicating liquor in the Lakeside and Lester Park neighborhoods.  A "NO" vote means I do not support eliminating the state law which prohibits the sale of intoxicating liquor in the Lakeside and Lester Park neighborhoods.',
      '69;1132;17000;;CITY QUESTION 2 (Duluth);DULUTH CHARTER AMENDMENT – RANKED CHOICE VOTING;Shall the Duluth City Charter be amended to adopt Ranked Choice Voting, also known as Single Transferable Vote, as the method for electing the mayor and the city councilors without a separate primary election and with ballot format and rules for counting votes to be adopted by ordinance?     A "Yes" vote means the Duluth City Charter will be amended to adopt Ranked Choice Voting as the method for electing the mayor and city councilors with the ballot format and rules for counting votes to be adopted by ordinance.    A "No" vote means the Duluth City Charter will not be amended to adopt Ranked Choice Voting as the method for electing the mayor and city councilors.',
      '69;1133;17000;;CITY QUESTION 3 (Duluth);DULUTH CHARTER AMENDMENT – METHOD FOR SETTING FEE PAID TO CITY COUNCILORS;Shall the Duluth City Charter be amended to have the fee paid to city council members determined by the Charter Commission, approved by a two-thirds vote of the city council and the new fee taking effect the January after the next municipal election?',
      '10;5031;;0112;SCHOOL DISTRICT QUESTION 1 (ISD #112);REVOKING EXISTING REFERENDUM REVENUE  AUTHORIZATION^ APPROVING NEW AUTHORIZATION;The board of Independent School District No. 112 (Eastern Carver County Schools) has proposed to revoke the school district\'s existing referendum revenue authorization of $379.19 per pupil and to replace that authorization with a new authorization of $829.19 per pupil.  A portion of this proposed referendum revenue authorization would replace the portion of the school district\'s existing authorization which is scheduled to expire after taxes payable in 2016.  The proposed new referendum revenue authorization would be applicable for ten years, beginning with taxes payable in 2016, unless otherwise revoked or reduced as provided by law.      Shall the school district\'s existing referendum revenue authorization be revoked and the increase in the revenue proposed by the board of Independent School District No. 112 be approved?      BY VOTING "YES" ON THIS BALLOT QUESTION, YOU ARE VOTING FOR A PROPERTY TAX INCREASE.',
      '10;5032;;0112;SCHOOL DISTRICT QUESTION 2 (ISD #112);APPROVAL OF SCHOOL DISTRICT BOND ISSUE;If School District Question 1 is approved, shall the board of Independent School District No. 112 (Eastern Carver County Schools) also be authorized to issue its general obligation school building bonds in an amount not to exceed $66,700,000 to provide funds for  the acquisition and betterment of school sites and facilities, including  the acquisition of land^ the construction and equipping of a new elementary school facility, a multi-purpose facility and a swimming pool and related improvements^ the construction and equipping of additions to the Clover Ridge and Victoria Elementary School facilities^ and the completion of deferred maintenance projects at various school sites and facilities?    BY VOTING "YES" ON THIS BALLOT QUESTION, YOU  ARE VOTING FOR A PROPERTY TAX INCREASE.'
    ];

    let metas = questions.map((q) => {
      return new Meta(q, { set: 'questions' }, {}, { get: () => 'test' });
    });

    expect(metas[0].get('id')).toBe('test-local-69-17000-1131');
    expect(metas[0].get('district')).toBe('17000');
    expect(metas[0].get('contest')).toBe('1131');
    expect(metas[0].get('type')).toBe('local');
    expect(metas[0].get('questionTitle')).toMatch('Proposition');
    expect(metas[0].get('questionText')).toMatch('Lakeside and Lester Park neighborhoods');

    expect(metas[1].get('id')).toBe('test-local-69-17000-1132');
    expect(metas[1].get('district')).toBe('17000');
    expect(metas[1].get('contest')).toBe('1132');
    expect(metas[0].get('type')).toBe('local');
    expect(metas[1].get('questionTitle')).toMatch('Charter');
    expect(metas[1].get('questionText')).toMatch('to adopt Ranked Choice Voting');

    expect(metas[4].get('id')).toBe('test-school-10-0112-5032');
    expect(metas[4].get('district')).toBe('0112');
    expect(metas[4].get('contest')).toBe('5032');
    expect(metas[4].get('type')).toBe('school');
    expect(metas[4].get('questionTitle')).toMatch('Bond Issue');
    expect(metas[4].get('questionText')).toMatch('elementary school facility');
  });

  test('parses local districts', () => {
    let districts = [
      '65;Renville;56572;Sacred Heart',
      '66;Rice;38150;Lonsdale',
      '69;St. Louis;02872;Aurora'
    ];
    districts = districts.map((d) => {
      return new Meta(d, { set: 'districts', type: 'local' }, {}, { get: () => 'test' });
    });

    expect(districts[0].get('id')).toBe('test-local-65-56572');
    expect(districts[0].get('type')).toBe('local');
    expect(districts[0].get('name')).toMatch('Sacred Heart');
  });

  test('parses school districts', () => {
    let districts = [
      '0255;PINE ISLAND;25;Goodhue',
      '0270;HOPKINS;27;Hennepin',
      '0271;BLOOMINGTON;27;Hennepin',
      '0271;BLOOMINGTON;70;Scott'
    ];
    districts = districts.map((d) => {
      return new Meta(d, { set: 'districts', type: 'school' }, {}, { get: () => 'test' });
    });

    expect(districts[0].get('id')).toBe('test-school-25-0255');
    expect(districts[0].get('type')).toBe('school');
    expect(districts[0].get('name')).toMatch('Pine Island');
  });
});
