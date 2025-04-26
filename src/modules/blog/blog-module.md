
---

# 📄 `blog-module.md`

## Blog Module

### Overview
The Blog module manages all blog-related content, including creating, updating, deleting, and listing blog posts.  
Each blog post can have multiple images, multilingual labels, tags, and belongs to a blog category.

---

### API Endpoints

| Method | Endpoint            | Access        | Description               |
|:-------|:---------------------|:--------------|:---------------------------|
| GET    | `/`                  | Public        | Fetch all blogs            |
| GET    | `/slug/:slug`         | Public        | Fetch a blog by its slug    |
| POST   | `/`                  | Admin         | Create a new blog           |
| PUT    | `/:id`               | Admin         | Update a blog               |
| DELETE | `/:id`               | Admin         | Delete a blog               |

---

### Data Model (`IBlog`)

| Field          | Type            | Required | Description                           |
|:---------------|:-----------------|:---------|:--------------------------------------|
| title          | string           | ✅        | Blog title                            |
| slug           | string           | ✅        | URL-friendly unique slug              |
| content        | string           | ✅        | Full blog content                     |
| summary        | string           | ✅        | Short description (max 300 characters)|
| images         | string[]         | ✅        | Blog images                           |
| tags           | string[]         | ❌        | Tags for the blog                     |
| category       | ObjectId (ref: BlogCategory) | ✅ | Blog category reference     |
| author         | string           | ❌        | Author name (default: "Anastasia König") |
| isPublished    | boolean          | ❌        | Published status (default: true)      |
| publishedAt    | Date             | ❌        | Publish date                          |
| isActive       | boolean          | ❌        | Active status                         |
| label          | object (tr, en, de) | ✅       | Multilingual title                   |
| comments       | ObjectId[] (ref: Comment) | ❌ | Related comments              |
| createdAt      | Date             | ✅        | Auto-generated                       |
| updatedAt      | Date             | ✅        | Auto-generated                       |

---

### Features
- Multilingual blog support (Turkish, English, German)
- Image upload support (up to 5 images per blog)
- Automatic slug generation if not provided
- Tag support
- Blog-Category relationship
