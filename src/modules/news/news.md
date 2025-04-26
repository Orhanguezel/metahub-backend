# 📰 News Module

## Routes

| Method | Endpoint | Description | Access |
|:--|:--|:--|:--|
| GET | /news | List all news (filterable by category and language) | Public |
| GET | /news/slug/:slug | Get news by slug | Public |
| GET | /news/:id | Get news by ID | Public |
| POST | /news | Create a new news article (multi-language) | Admin / Moderator |
| PUT | /news/:id | Update news article | Admin / Moderator |
| DELETE | /news/:id | Delete news article | Admin |

## Fields

- **title**: `{ tr: string, en: string, de: string }`
- **slug**: string (automatically generated from title)
- **summary**: `{ tr: string, en: string, de: string }`
- **content**: `{ tr: string, en: string, de: string }`
- **images**: array of uploaded image URLs
- **tags**: array of strings
- **author**: string (optional, default "System")
- **category**: ObjectId reference to `NewsCategory`
- **isPublished**: boolean
- **publishedAt**: Date
- **comments**: array of ObjectIds (linked to `Comment` model)

## Notes

- Slug is auto-generated based on title.
- Supports multi-language (TR / EN / DE) fields.
- Category is dynamically linked to `NewsCategory`.
- Upload up to **5 images** per news article.
- Comments are populated automatically.
- File upload folder: `/uploads/news-images/`
