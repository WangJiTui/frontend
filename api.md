---
title: http://localhost:8080
language_tabs:
  - shell: Shell
  - http: HTTP
  - javascript: JavaScript
  - ruby: Ruby
  - python: Python
  - php: PHP
  - java: Java
  - go: Go
toc_footers: []
includes: []
search: true
code_clipboard: true
highlight_theme: darkula
headingLevel: 2
generator: "@tarslib/widdershins v4.0.30"

---

# http://localhost:8080

Base URLs:

# Authentication

# user-controller

<a id="opIdregist"></a>

## POST regist

POST /api/student/regist

> Body 请求参数

```json
{
  "id": 0,
  "username": "string",
  "passwordHash": "string",
  "email": "string",
  "role": {},
  "createdAt": "2019-08-24T14:15:22Z"
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|body|body|[User](#schemauser)| 否 |none|

> 返回示例

> 200 Response

```
{"code":0,"message":"string","data":{}}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Result](#schemaresult)|

<a id="opIdlogin"></a>

## POST login

POST /api/student/login

> Body 请求参数

```json
{
  "id": 0,
  "username": "string",
  "passwordHash": "string",
  "email": "string",
  "role": {},
  "createdAt": "2019-08-24T14:15:22Z"
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|body|body|[User](#schemauser)| 否 |none|

> 返回示例

> 200 Response

```
{"code":0,"message":"string","data":{}}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Result](#schemaresult)|

<a id="opIdcheckStudentNumber"></a>

## POST checkStudentNumber

POST /api/student/checkStudentNumber

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|userName|query|string| 是 |none|

> 返回示例

> 200 Response

```
{"code":0,"message":"string","data":{}}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Result](#schemaresult)|

<a id="opIduserInfo"></a>

## GET userInfo

GET /api/student/getUserInfo

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|token|header|string| 是 |none|

> 返回示例

> 200 Response

```
{"code":0,"message":"string","data":{}}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Result](#schemaresult)|

# interview-controller

<a id="opIdstartinterview"></a>

## POST startinterview

POST /api/interviews/start

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|token|header|string| 是 |none|

> 返回示例

> 200 Response

```
{"code":0,"message":"string","data":{}}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Result](#schemaresult)|

<a id="opIdgetQuestion"></a>

## GET getQuestion

GET /api/interviews/question

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|token|header|string| 是 |none|

> 返回示例

> 200 Response

```
{"code":0,"message":"string","data":{}}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Result](#schemaresult)|

<a id="opIdanswerQuestion"></a>

## POST answerQuestion

POST /api/interviews/question

> Body 请求参数

```yaml
videoFile: ""

```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|answer|query|string| 是 |none|
|token|header|string| 是 |none|
|body|body|object| 否 |none|
|» videoFile|body|string(binary)| 是 |none|

> 返回示例

> 200 Response

```
{"code":0,"message":"string","data":{}}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Result](#schemaresult)|

<a id="opIdcreateInterview"></a>

## POST createInterview

POST /api/interviews/create

> Body 请求参数

```yaml
resume_file: ""
job_file: ""

```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|position|query|string| 是 |none|
|token|header|string| 是 |none|
|body|body|object| 否 |none|
|» resume_file|body|string(binary)| 是 |none|
|» job_file|body|string(binary)| 是 |none|

> 返回示例

> 200 Response

```
{"code":0,"message":"string","data":{}}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Result](#schemaresult)|

<a id="opIdcompleteInterview"></a>

## POST completeInterview

POST /api/interviews/complete

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|position|query|string| 是 |none|
|token|header|string| 是 |none|

> 返回示例

> 200 Response

```
{"code":0,"message":"string","data":{}}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Result](#schemaresult)|

# 数据模型

<h2 id="tocS_User">User</h2>

<a id="schemauser"></a>
<a id="schema_User"></a>
<a id="tocSuser"></a>
<a id="tocsuser"></a>

```json
{
  "id": 0,
  "username": "string",
  "passwordHash": "string",
  "email": "string",
  "role": {},
  "createdAt": "2019-08-24T14:15:22Z"
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|id|integer(int64)|false|none||none|
|username|string|false|none||none|
|passwordHash|string|false|none||none|
|email|string|false|none||none|
|role|object|false|none||none|
|createdAt|string(date-time)|false|none||none|

<h2 id="tocS_Result">Result</h2>

<a id="schemaresult"></a>
<a id="schema_Result"></a>
<a id="tocSresult"></a>
<a id="tocsresult"></a>

```json
{
  "code": 0,
  "message": "string",
  "data": {}
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|integer(int32)|false|none||none|
|message|string|false|none||none|
|data|object|false|none||none|

