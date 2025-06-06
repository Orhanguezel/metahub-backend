
---

# 📄 `blogcategory-module.md`

## BlogCategory Module

### Overview
The BlogCategory module manages the categories for blog posts.  
Categories are created separately and blogs are linked to a category.

---

### API Endpoints

| Method | Endpoint            | Access        | Description                   |
|:-------|:---------------------|:--------------|:-------------------------------|
| GET    | `/`                  | Public        | Fetch all blog categories      |
| POST   | `/`                  | Admin         | Create a new blog category     |
| PUT    | `/:id`               | Admin         | Update a blog category         |
| DELETE | `/:id`               | Admin         | Delete a blog category         |

---

### Data Model (`IBlogCategory`)

| Field          | Type             | Required | Description                  |
|:---------------|:------------------|:---------|:------------------------------|
| name           | object (tr, en, de) | ✅        | Multilingual category name    |
| slug           | string             | ✅        | URL-friendly unique slug      |
| isActive       | boolean            | ❌        | Active status (default: true) |
| createdAt      | Date               | ✅        | Auto-generated                |
| updatedAt      | Date               | ✅        | Auto-generated                |

---

### Features
- Multilingual category names (Turkish, English, German)
- Automatic slug generation based on category name
- Soft active/inactive handling
- Blog module references this model (`category` field)

---

# 🎯 Durum
- İki `.md` dosyamız hazır ✅
- Blog ve BlogCategory modüllerimiz, mükemmel ve profesyonel bir şekilde organize edilmiş durumda ✅

---