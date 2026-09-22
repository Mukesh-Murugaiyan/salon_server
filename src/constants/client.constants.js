/**
 * Centralized Client Domain Constants
 */

const GENDER_OPTIONS = [
  { label: 'Female', value: 'FEMALE' },
  { label: 'Male', value: 'MALE' },
  { label: 'Other', value: 'OTHER' },
  { label: 'Prefer not to say', value: 'PREFER_NOT_TO_SAY' },
];

const GENDER_VALUES = GENDER_OPTIONS.map((g) => g.value);

module.exports = {
  GENDER_OPTIONS,
  GENDER_VALUES,
};
