#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export NG_CLI_ANALYTICS=false
export NG_BUILD_MAX_WORKERS=4
npm test -- --watch=false --ts-config=tsconfig.admin.spec.json \
  --include='src/app/core/services/*.spec.ts' \
  --include='src/app/core/models/student-schedules.spec.ts' \
  --include='src/app/core/utils/*.spec.ts' \
  --include='src/app/layouts/main/*.spec.ts' \
  --include='src/app/core/components/login/*.spec.ts' \
  --include='src/app/shared/components/header/*.spec.ts' \
  --include='src/app/features/users-component/pages/{students,moderator}/*.spec.ts' \
  --include='src/app/features/{admin-operations,student-finance,courses,curriculum,expenses,home,settings,analytics}/*.spec.ts'
