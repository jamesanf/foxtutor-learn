# Student profile architecture

## Scope

Student records keep contact, safeguarding, billing and academic context in the
existing `students` table. The pupil email remains the Learn login email;
parent/carer email is an additional contact field and does not alter account
ownership.

The profile also stores:

- billing address;
- additional support needs;
- class texts;
- level;
- the international preference used for UK clock-change reminders;
- an academic system and current academic year.

All profile writes are authenticated admin mutations protected by the existing
session authorization and CSRF checks. Values are validated on the server and
persisted with parameterized D1 statements.

## Academic-year progression

`academic_year_system` is one of:

- `ENGLISH`, with `Y5` through `Y13`;
- `SCOTTISH`, with `P6`, `P7`, and `S1` through `S6`;
- `MATURE`, `PRIVATE`, or `INTERNATIONAL`, which are static categories.

English and Scottish years advance at the 15 August boundary in the
`Europe/London` timezone. The record stores the last academic-year anchor date
so reads can advance it once per crossed boundary. The progression is capped at
`Y13` and `S6`; static categories never change. The calculation uses the
server-provided UTC instant and does not trust browser time.

## Student manager

The student detail page keeps the profile summary separate from two
independently collapsible, paginated sections for lessons and resources. The
section page sizes use the established 12, 24 and 48-row options. Resource
creation remains available from the section body for active students, while
deactivation remains an explicit action at the bottom of the record.

Migration `0014_student_profiles.sql` is forward-only and must be applied
before deploying code that reads or writes these columns.
