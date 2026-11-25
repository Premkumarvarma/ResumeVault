# ResumeVault — Recruiter Resume Manager

A responsive, browser-based resume database. Add a candidate's name, domain and resume; search/filter saved candidates; preview PDF resumes; download files; delete records; and export the candidate list as CSV.

## Run it

1. Extract the ZIP.
2. Open the `resume_recruiter_portal` folder.
3. Start a local web server in that folder (recommended):
   - If Python is installed: `python -m http.server 8000`
   - Or use the **Live Server** extension in VS Code.
4. Visit `http://localhost:8000` in your browser.

You can also try opening `index.html` directly, but a local server is recommended for consistent browser storage behavior.

## Features

- Person name, domain and resume upload (PDF, DOC, DOCX)
- Search by candidate name or domain
- Filter by domain
- PDF preview inside the page
- Download original resume
- Delete candidate records
- Export candidate details to CSV
- Responsive layout for desktop and mobile

## Important storage note

This is a front-end starter version. Candidate details and resume files are stored in **IndexedDB in the current browser on the current computer**. They are not uploaded to a server, and other recruiters/devices cannot see them. Clearing browser site data, changing browser profiles, or using another computer may make the records unavailable. Export/backup your candidate list and keep original resumes safely.

For a shared, multi-user recruiter portal with login, central database, access controls and backups, connect this UI to a secure backend (for example, Node.js + PostgreSQL and private file storage) before using it as a company-wide system. Handle candidate personal data in accordance with your organization's privacy and retention policies.
