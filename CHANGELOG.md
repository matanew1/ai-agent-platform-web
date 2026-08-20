# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.8.0](https://github.com/matanew1/ai-agent-platform-web/compare/v0.7.0...v0.8.0) (2026-08-20)


### Features

* **agents:** tool-registry tree, model/temperature tooltips, expandable system prompt, and a stale-tools fix ([e1e83b0](https://github.com/matanew1/ai-agent-platform-web/commit/e1e83b0a9258444993c6cef6e23d54ab602e78e1))
* **app:** wire Overview/profile routing, styling, and i18n for this batch; E2E coverage ([6f0081e](https://github.com/matanew1/ai-agent-platform-web/commit/6f0081ec3419682937ba1bb4911fc73faa568fe2))
* **brand:** Wyrmind dragon mark, sidebar Overview entry, and a circular-avatar fix ([74369b7](https://github.com/matanew1/ai-agent-platform-web/commit/74369b71d81a341fb25fe2250dbb60e20cb91bed))
* **chat:** clear session, session pagination, and photo/initials message avatars ([0ccd718](https://github.com/matanew1/ai-agent-platform-web/commit/0ccd71851d3f05a723422c0a78387ef43c866b50))
* **documents:** paginate the document library with a Load more control ([078e60c](https://github.com/matanew1/ai-agent-platform-web/commit/078e60c2a1cbdc9b5202c3e7652032fced98a1be))
* **feedback:** feedback modal, wired into Settings ([12687cd](https://github.com/matanew1/ai-agent-platform-web/commit/12687cdc05802c7dd198cc5f7b7115614e1b3419))
* **overview:** new Overview analytics dashboard ([3fa1f74](https://github.com/matanew1/ai-agent-platform-web/commit/3fa1f74638a93c8086018a1848d745969fb9ebc4))
* **profile:** read-only profile page, delete account, and a WorkOS-photo/initials avatar ([4034171](https://github.com/matanew1/ai-agent-platform-web/commit/40341719bb8d8b8bf009d79c97da4c76f9670ba5))


### Bug Fixes

* **documents,chat:** keep Load more available while searching a loaded page ([09d81d0](https://github.com/matanew1/ai-agent-platform-web/commit/09d81d0ba68e8901a9041187921911bf40efb5f9))
* **documents:** avoid double-counting a new document under a stale closure ([e5736a9](https://github.com/matanew1/ai-agent-platform-web/commit/e5736a90bd85d5b7d7b246c061712f3934b98282))

## [0.7.0](https://github.com/matanew1/ai-agent-platform-web/compare/v0.6.0...v0.7.0) (2026-08-17)


### Features

* **schedules:** move a schedule to a different owned agent ([480523a](https://github.com/matanew1/ai-agent-platform-web/commit/480523af308329a280441dd12d31fa81b6de5b6f))


### Bug Fixes

* **settings:** balance Settings page columns automatically ([d4c73f0](https://github.com/matanew1/ai-agent-platform-web/commit/d4c73f093a4db068bedd9afca8624cb21b0f8279))

## [0.6.0](https://github.com/matanew1/ai-agent-platform-web/compare/v0.5.0...v0.6.0) (2026-08-17)


### Features

* **schedules:** title, description, per-schedule tool scope, test-run preview ([b7e4618](https://github.com/matanew1/ai-agent-platform-web/commit/b7e4618cc4e4b31372a540431006f6a6dad43b09))

## [0.5.0](https://github.com/matanew1/ai-agent-platform-web/compare/v0.4.0...v0.5.0) (2026-08-17)


### Features

* **schedules:** dedicated run-history page, separate from chat sessions ([4d3a075](https://github.com/matanew1/ai-agent-platform-web/commit/4d3a07522580ca1c9067b8cf76f386d112a54d86))


### Bug Fixes

* **schedules:** address history-page review findings ([ddfcf98](https://github.com/matanew1/ai-agent-platform-web/commit/ddfcf9881b58248b8c43aaf39fa47f87d4e3621b))

## [0.4.0](https://github.com/matanew1/ai-agent-platform-web/compare/v0.3.0...v0.4.0) (2026-08-16)


### Features

* **schedules:** agent workspace UI for scheduled unattended runs ([110a440](https://github.com/matanew1/ai-agent-platform-web/commit/110a440b3d378215ad1f891cd337fc0448aa5ef0))
* **schedules:** redesign dashboard as a card grid with create/edit modals ([6806655](https://github.com/matanew1/ai-agent-platform-web/commit/6806655541ffe1f52db39ca60ffbbebc1d925720))


### Bug Fixes

* **schedules:** address dashboard-redesign review findings ([bc778fe](https://github.com/matanew1/ai-agent-platform-web/commit/bc778fe5abb56717e2d135afb2d2a378de14e38b))
* **schedules:** move to a top-level dashboard, fix error handling, add cron presets ([6559fcd](https://github.com/matanew1/ai-agent-platform-web/commit/6559fcd06a0fa5a308458262a27d42f6681fb54d))

## [0.3.0](https://github.com/matanew1/ai-agent-platform-web/compare/v0.2.0...v0.3.0) (2026-08-16)


### Features

* **chat:** add a stop-generation control for streaming responses ([048bbe6](https://github.com/matanew1/ai-agent-platform-web/commit/048bbe6c08470605f6a0e2a7aac2d8662fc8cca7))
* **legal:** add terms, privacy, and cookies pages ([934806a](https://github.com/matanew1/ai-agent-platform-web/commit/934806a6ecce465f6624096e95f280e75307d163))

## 0.2.0 (2026-08-13)


### Features

* **chat:** show tool activity and source citations ([47415ed](https://github.com/matanew1/ai-agent-platform-web/commit/47415edb641bf8e59967f97b3837e6cb43c5796b))
* **session:** delete sessions from sidebar ([88771b0](https://github.com/matanew1/ai-agent-platform-web/commit/88771b0528a398f2a350c5cbe3e9a94f1a5b1956))
* **settings:** personalize and refine workspace UI ([1ad285c](https://github.com/matanew1/ai-agent-platform-web/commit/1ad285cfeb51022fb9c471dcd823ec9272525d2e))
* **ui:** refresh platform experience ([7d17e97](https://github.com/matanew1/ai-agent-platform-web/commit/7d17e97105b9cb1741bb526c9c9b296e047927b1))
* **web:** publish agent platform client ([e8b22ab](https://github.com/matanew1/ai-agent-platform-web/commit/e8b22ab96f97aa3901521540eece77008a998dd0))
* **workspace:** improve multilingual accessible chat ([25ec05a](https://github.com/matanew1/ai-agent-platform-web/commit/25ec05ae697db93b32399883347c6529da69d644))
