# Firebase MCP Quick Reference

This guide shows how to use the Firebase Model Context Protocol (MCP) server for all Firebase operations during backend setup.

## What is Firebase MCP?

The Firebase MCP server allows Claude to interact directly with Firebase services using specialized tools instead of CLI commands. This provides better error handling and context awareness.

## Available Firebase MCP Tools

### Authentication & Environment

#### 1. `firebase_login`
Sign into Firebase CLI and MCP server.

**When to use:**
- First time setup
- When authentication expires

**Example request:**
```
"Please login to Firebase using MCP"
```

**What happens:**
- Opens browser for Google authentication
- Returns auth code to complete login

---

#### 2. `firebase_logout`
Sign out of Firebase.

**Parameters:**
- `email` (optional): Specific account to logout

**Example:**
```
"Logout from Firebase"
```

---

#### 3. `firebase_get_environment`
Check current Firebase configuration.

**Returns:**
- Current authenticated user
- Project directory
- Active Firebase project
- Available projects

**Example request:**
```
"Check Firebase environment status"
```

**Use this to:**
- Verify you're logged in
- See which project is active
- Check project directory

---

#### 4. `firebase_update_environment`
Change Firebase environment settings.

**Parameters:**
- `project_dir`: Set working directory
- `active_project`: Switch active project
- `active_user_account`: Switch user account

**Example:**
```json
{
  "project_dir": "/Users/juraj/Documents/GitHub/Happify-backend",
  "active_project": "happify-2-prod"
}
```

---

### Project Management

#### 5. `firebase_list_projects`
Get list of all Firebase projects you have access to.

**Parameters:**
- `page_size`: Number of projects per page (default: 20)
- `page_token`: For pagination

**Example request:**
```
"List all my Firebase projects"
```

---

#### 6. `firebase_create_project`
Create new Firebase project.

**Parameters:**
- `project_id`: Unique project ID (required)
- `display_name`: Human-readable name

**Example:**
```json
{
  "project_id": "happify-2-prod",
  "display_name": "Happify 2 Production"
}
```

**Important:**
- Project ID must be globally unique
- Use lowercase, numbers, hyphens only
- Cannot be changed after creation

---

#### 7. `firebase_get_project`
Get details about the currently active project.

**Returns:**
- Project name
- Project ID
- Project number
- Display name

**Example request:**
```
"Get current Firebase project details"
```

---

### Initialization

#### 8. `firebase_init`
Initialize Firebase features in the current project directory.

**Parameters:**
```json
{
  "features": {
    "firestore": {
      "location_id": "us-east1",
      "database_id": "(default)",
      "rules": "...",
      "rules_filename": "firestore.rules"
    },
    "storage": {
      "rules": "...",
      "rules_filename": "storage.rules"
    },
    "database": {
      "rules": "...",
      "rules_filename": "database.rules.json"
    },
    "hosting": {
      "public_directory": "public",
      "single_page_app": false,
      "site_id": "..."
    },
    "dataconnect": {
      "service_id": "...",
      "location_id": "us-east1",
      "cloudsql_instance_id": "...",
      "provision_cloudsql": false
    }
  }
}
```

**Example for Happify:**
```json
{
  "features": {
    "firestore": {
      "location_id": "us-east1",
      "database_id": "(default)",
      "rules_filename": "firestore.rules"
    }
  }
}
```

**What it creates:**
- `firebase.json` - Firebase configuration
- `.firebaserc` - Project aliases
- `firestore.rules` - Security rules file
- `firestore.indexes.json` - Database indexes

---

### Firestore Operations

#### 9. `firestore_get_documents`
Read documents from Firestore.

**Parameters:**
- `paths`: Array of document paths
- `database`: Database ID (default: "(default)")
- `use_emulator`: Use local emulator (default: false)

**Example:**
```json
{
  "paths": ["users/user123", "users/user456"],
  "database": "(default)"
}
```

---

#### 10. `firestore_delete_document`
Delete a document from Firestore.

**Parameters:**
- `path`: Document path (e.g., "users/user123")
- `database`: Database ID
- `use_emulator`: Use emulator

**Example:**
```json
{
  "path": "users/testuser",
  "database": "(default)"
}
```

---

#### 11. `firestore_list_collections`
List all top-level collections in Firestore.

**Parameters:**
- `database`: Database ID
- `use_emulator`: Use emulator

**Example request:**
```
"List all Firestore collections"
```

---

#### 12. `firestore_query_collection`
Query documents in a collection with filters.

**Parameters:**
- `collection_path`: Path to collection
- `filters`: Array of filter objects
- `limit`: Max results (default: 10)
- `order`: Sort order
- `database`: Database ID
- `use_emulator`: Use emulator

**Example:**
```json
{
  "collection_path": "users",
  "filters": [
    {
      "field": "profile.userName",
      "op": "EQUAL",
      "compare_value": {
        "string_value": "John"
      }
    }
  ],
  "limit": 20
}
```

**Filter operators:**
- `EQUAL`
- `NOT_EQUAL`
- `LESS_THAN`
- `LESS_THAN_OR_EQUAL`
- `GREATER_THAN`
- `GREATER_THAN_OR_EQUAL`
- `ARRAY_CONTAINS`
- `ARRAY_CONTAINS_ANY`
- `IN`
- `NOT_IN`

---

### Security Rules

#### 13. `firebase_get_security_rules`
Get security rules for a service.

**Parameters:**
- `type`: Service type ("firestore", "rtdb", "storage")

**Example:**
```json
{
  "type": "firestore"
}
```

---

#### 14. `firebase_validate_security_rules`
Validate security rules syntax.

**Parameters:**
- `type`: Service type
- `source`: Rules source code (optional)
- `source_file`: Path to rules file (optional)

**Example:**
```json
{
  "type": "firestore",
  "source_file": "firestore.rules"
}
```

**Use this to:**
- Check rules syntax before deployment
- Catch errors early

---

### App Management

#### 15. `firebase_list_apps`
List Firebase apps in the project.

**Parameters:**
- `platform`: Filter by platform ("ios", "android", "web", "all")

**Example:**
```json
{
  "platform": "ios"
}
```

---

#### 16. `firebase_create_app`
Register a new Firebase app.

**Parameters:**
- `platform`: "web", "ios", or "android"
- `display_name`: App name
- `ios_config`: iOS-specific config (bundle_id, app_store_id)
- `android_config`: Android config (package_name)

**Example for iOS:**
```json
{
  "platform": "ios",
  "display_name": "Happify 2 iOS",
  "ios_config": {
    "bundle_id": "com.yourcompany.happify2"
  }
}
```

---

#### 17. `firebase_get_sdk_config`
Get Firebase SDK configuration for an app.

**Parameters:**
- `platform`: "ios", "android", or "web"
- OR `app_id`: Specific app ID

**Example:**
```json
{
  "platform": "ios"
}
```

**Returns:**
- `GoogleService-Info.plist` content for iOS
- `google-services.json` for Android
- Config object for Web

---

### Remote Config

#### 18. `remoteconfig_get_template`
Get Remote Config template.

**Parameters:**
- `version_number`: Specific version (optional)

**Example request:**
```
"Get current Remote Config template"
```

---

#### 19. `remoteconfig_update_template`
Publish new Remote Config template.

**Parameters:**
- `template`: Remote Config template object
- `force`: Bypass ETag validation (optional)
- `version_number`: Rollback to version (optional)

**Example:**
```json
{
  "template": {
    "parameters": {
      "quotes_database": {
        "defaultValue": {
          "value": "[...]"
        }
      }
    }
  }
}
```

---

### Authentication

#### 20. `auth_get_users`
Get Firebase Auth users.

**Parameters:**
- `uids`: Array of user IDs
- `emails`: Array of emails
- `phone_numbers`: Array of phone numbers
- `limit`: Max results (default: 100)

**Example:**
```json
{
  "uids": ["user123", "user456"],
  "limit": 50
}
```

---

#### 21. `auth_update_user`
Update user account properties.

**Parameters:**
- `uid`: User ID (required)
- `disabled`: Enable/disable user
- `claim`: Custom claim to set

**Example:**
```json
{
  "uid": "user123",
  "claim": {
    "key": "admin",
    "value": true
  }
}
```

---

### Cloud Messaging

#### 22. `messaging_send_message`
Send FCM push notification.

**Parameters:**
- `registration_token`: Device token (OR topic)
- `topic`: Topic name (OR registration_token)
- `title`: Notification title
- `body`: Notification body
- `image`: Image URL (optional)

**Example:**
```json
{
  "registration_token": "device_token_here",
  "title": "Happify",
  "body": "Time for your daily mood check!",
  "image": "https://example.com/icon.png"
}
```

---

### Storage

#### 23. `storage_get_object_download_url`
Get download URL for Storage object.

**Parameters:**
- `object_path`: Path to object
- `bucket`: Bucket name (optional)
- `use_emulator`: Use emulator

**Example:**
```json
{
  "object_path": "quotes/motivational.jpg",
  "bucket": "happify-2-prod.appspot.com"
}
```

---

### Realtime Database

#### 24. `realtimedatabase_get_data`
Read data from Realtime Database.

**Parameters:**
- `path`: Database path (e.g., "/users/user123")
- `databaseUrl`: Database URL (optional)

**Example:**
```json
{
  "path": "/users/user123/profile"
}
```

---

#### 25. `realtimedatabase_set_data`
Write data to Realtime Database.

**Parameters:**
- `path`: Database path
- `data`: JSON string to write
- `databaseUrl`: Database URL (optional)

**Example:**
```json
{
  "path": "/users/user123/profile",
  "data": "{\"userName\": \"John\", \"email\": \"john@example.com\"}"
}
```

---

## Common Workflows

### Initial Setup Workflow

```markdown
1. Check environment:
   "Check Firebase environment with firebase_get_environment"

2. Login if needed:
   "Login to Firebase with firebase_login"

3. List existing projects:
   "List all Firebase projects with firebase_list_projects"

4. Create new project:
   Use firebase_create_project with:
   {
     "project_id": "happify-2-prod",
     "display_name": "Happify 2 Production"
   }

5. Set project directory:
   Use firebase_update_environment with:
   {
     "project_dir": "/Users/juraj/Documents/GitHub/Happify-backend",
     "active_project": "happify-2-prod"
   }

6. Initialize Firebase features:
   Use firebase_init with Firestore configuration
```

### Testing Firestore Workflow

```markdown
1. List collections:
   "List all Firestore collections"

2. Query documents:
   Use firestore_query_collection to search

3. Get specific documents:
   Use firestore_get_documents with paths

4. Validate security rules:
   Use firebase_validate_security_rules before deployment
```

---

## Best Practices

### 1. Always Check Environment First
```
"Check Firebase environment status"
```
This shows:
- If you're logged in
- Current project
- Project directory

### 2. Validate Before Deploy
```
"Validate Firestore security rules from firestore.rules file"
```

### 3. Use Emulators for Testing
Set `use_emulator: true` in Firestore operations to test locally.

### 4. Handle Errors Gracefully
MCP tools return structured errors. Check for:
- Authentication errors → Run firebase_login
- Permission errors → Check project access
- Not found errors → Verify resource exists

---

## Troubleshooting

### "Not authenticated" error
→ Run `firebase_login` to authenticate

### "Project not found" error
→ Check active project with `firebase_get_environment`
→ Switch project with `firebase_update_environment`

### "Permission denied" error in Firestore
→ Check security rules with `firebase_get_security_rules`
→ Validate rules with `firebase_validate_security_rules`

### "Feature not initialized" error
→ Run `firebase_init` with required features

---

## Example: Complete Phase A Setup

```markdown
User: "Set up Firebase for Happify backend"

Claude will:
1. Check environment (firebase_get_environment)
2. Login if needed (firebase_login)
3. Create project (firebase_create_project)
4. Set directory (firebase_update_environment)
5. Initialize Firestore (firebase_init)
6. Create iOS app (firebase_create_app)
7. Get config file (firebase_get_sdk_config)
8. Validate rules (firebase_validate_security_rules)
```

---

## Next Steps

After setting up Firebase with MCP:
1. Create `firestore.rules` file
2. Deploy rules: `firebase deploy --only firestore:rules`
3. Set up Cloud Functions
4. Deploy functions: `firebase deploy --only functions`

See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for complete instructions.
