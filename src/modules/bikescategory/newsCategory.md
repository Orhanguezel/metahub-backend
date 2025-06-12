# 🗂️ News Category Module

## Routes

| Method | Endpoint | Description | Access |
|:--|:--|:--|:--|
| GET | /news-category | List all news categories | Public |
| GET | /news-category/:id | Get news category by ID | Public |
| POST | /news-category | Create new news category | Admin / Moderator |
| PUT | /news-category/:id | Update news category | Admin / Moderator |
| DELETE | /news-category/:id | Delete news category | Admin |

## Fields

- **title**: `{ tr: string, en: string, de: string }`
- **slug**: string (automatically generated from title)
- **description**: `{ tr?: string, en?: string, de?: string }`
- **isActive**: boolean (default: true)
- **createdAt**: Date
- **updatedAt**: Date

## Notes

- Slug is auto-generated from the title.
- Multi-language support is available for title and optional description.
- When a category is deleted, it should ideally be checked if any news is using it (best practice).
- Categories are used for organizing news articles dynamically.
