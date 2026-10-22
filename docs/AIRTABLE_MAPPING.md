# Airtable mapping rehearsal (Phase 2)

This is a paper exercise only. Nothing here imports real data.
All column names below are made up, so nothing private sits in this public repository.
The purpose is to find the gaps early, before the real import in Phase 11.

## 1. The made up Airtable tables

The old Airtable base was said to have these tables. The names here are invented.

| Airtable table | Column name | App table | App field | Notes |
| --- | --- | --- | --- | --- |
| People | Person ID | people | id | Kept as the new id only if it looks like a UUID. Otherwise a new id is made. |
| People | Full Name | people | full_name | Required. |
| People | Display Name | people | display_name | Missing means the first word of Full Name. |
| People | Nicknames | people | nicknames | Comma separated. Devanagari spellings belong here. |
| People | Gender | people | gender | male, female, other, unknown. Anything else becomes unknown. |
| People | Category | people | category | Free text, with the seven suggestions from section 8.1. |
| People | Surname Before Marriage | people | maiden_name | Shown as "née ...". |
| People | Phone | people | phones | Several phone numbers are allowed, so this column may hold more than one. |
| People | Email | people | email | |
| People | City | people | city | |
| People | How I Know Them | people | how_i_know | |
| People | Notes | people | notes | |
| People | Birth Month | people | birthday.month | Number. |
| People | Birth Day | people | birthday.day | Number. |
| People | Birth Year | people | birthday.year | Optional. |
| Organizations | Org Name | contexts | name | |
| Organizations | Org Type | contexts | kind | organization, school, college, society, group, place. |
| Groups | Group Name | contexts | name | |
| School | School Name | contexts | name | |
| Society | Society Name | contexts | name | |
| Memberships | Person ID | memberships | person_id | |
| Memberships | Context ID | memberships | context_id | |
| Memberships | Role | memberships | role | Free text such as Student, Parent, Resident, Colleague, Teacher. |
| Memberships | Years | memberships | period | Free text such as "1996 to 2002". |
| Relationships | Person ID A | relationships | person_id | |
| Relationships | Person ID B | relationships | relative_id | |
| Relationships | Link Type | relationships | type | Must map to one of the fifteen types in section 8.4. |
| Relationships | Note | relationships | notes | |
| Photos | Person ID | photos | person_id | |
| Photos | Attachment | photos | blob | Airtable attachment URL. It can expire. |

## 2. Questions to answer before Phase 11

1. Do all four of Organizations, Groups, School and Society still exist in the export? If some were only views of one table, the import screen must not create the same context twice.
2. Are the "Context ID" values the same kind of value as the "Person ID" values? If the old base used Airtable record numbers, they will not match the UUIDs in the export.
3. Which direction do the relationship rows point? The app reads a row as "person A is the type of person B". If Airtable stored it the other way round, the import screen needs the flip direction switch.
4. Are there relationship types that are not in section 8.4? Every unknown type has to be shown to Varun before the import, not silently turned into "other".
5. Do any people appear twice under slightly different names, for example a spelling change or a married name change? These need a manual decision.
6. Do the photo attachments still work? Airtable links can expire, so the images must be downloaded while the links are alive.
7. Is there a column the app has no field for? Right now every extra column would be lost. If that matters, the import should keep it in the notes field.

## 3. Known gaps found in this rehearsal

- The old base had no single "Contexts" table. Four separate tables have to be merged into one, and each row needs its kind set from the table it came from.
- The old base had no "is me" flag. The Me profile has to be chosen by hand, because only one person may have it.
- The old base had no timestamps. Everything imported gets today's date for created_at and updated_at, and a note says it was imported.
- The old base had no deleted flag. Deleted rows in Airtable should be skipped rather than imported as live records.
- The old base had no photos table with a stable id. Photos must be matched to people by the person id column.

## 4. What stays out of this repository

No CSV exports, no photos and no real names. The real import happens in Phase 11, on Varun's own machine, and the original export is kept untouched until the restore has been checked.
