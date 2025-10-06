#!/usr/bin/env python3
"""
Script to fix AppError calls that pass string literals instead of ErrorCode enum values
"""
import re
import os
import sys

def fix_apperror_in_file(filepath):
    """Fix AppError calls in a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        changes_made = 0

        # Check if ErrorCode is already imported
        has_errorcode_import = 'ErrorCode' in content and 'import' in content

        # Pattern 1: new AppError('string', ...) -> new AppError('string' as ErrorCode, ...)
        # This handles both throw new AppError(...) and return new AppError(...)
        pattern1 = r"new AppError\('([^']+)',\s*(\d+)"
        matches = re.findall(pattern1, content)

        if matches:
            # Add ErrorCode import if not present
            if not has_errorcode_import:
                # Find AppError import line
                import_pattern = r"(import\s+\{\s*AppError\s*\}\s+from\s+['\"]@/shared/errors/AppError['\"];)"
                if re.search(import_pattern, content):
                    content = re.sub(
                        import_pattern,
                        r"import { AppError, ErrorCode } from '@/shared/errors/AppError';",
                        content,
                        count=1
                    )
                elif re.search(r"(import\s+\{\s*AppError\s*\}\s+from\s+['\"]@shared/errors/AppError['\"];)", content):
                    content = re.sub(
                        r"(import\s+\{\s*AppError\s*\}\s+from\s+['\"]@shared/errors/AppError['\"];)",
                        r"import { AppError, ErrorCode } from '@shared/errors/AppError';",
                        content,
                        count=1
                    )

            # Replace all instances
            content = re.sub(pattern1, r"new AppError('\1' as ErrorCode, \2", content)

        # Pattern 2: Dynamic strings with template literals
        pattern2 = r"new AppError\(`([^`]+)`,\s*(\d+)"
        content = re.sub(pattern2, r"new AppError(`\1` as ErrorCode, \2", content)

        # Pattern 3: Three-parameter version: new AppError('string', statusCode, 'CODE', ...)
        pattern3 = r"new AppError\('([^']+)',\s*(\d+),\s*'([^']+)'"
        content = re.sub(pattern3, r"new AppError('\1' as ErrorCode, \2, '\3'", content)

        # Check if changes were made
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            changes_made = 1
            print(f"[OK] Fixed: {filepath}")
            return 1
        else:
            print(f"[SKIP] No changes: {filepath}")
            return 0

    except Exception as e:
        print(f"[ERROR] Error processing {filepath}: {e}")
        return 0

def main():
    # Files to process
    files = [
        "./modules/companies/services/CompanySettingsService.ts",
        "./modules/crm/controllers/AccountController.ts",
        "./modules/crm/controllers/ActivityController.ts",
        "./modules/crm/controllers/ContactController.ts",
        "./modules/crm/controllers/LeadController.ts",
        "./modules/crm/controllers/OpportunityController.ts",
        "./modules/crm/controllers/SearchController.ts",
        "./modules/crm/controllers/TerritoryController.ts",
        "./modules/crm/product-quote/catalog/services/product-category.service.ts",
        "./modules/crm/product-quote/catalog/services/product.service.ts",
        "./modules/crm/product-quote/documents/services/document-generation.service.ts",
        "./modules/crm/product-quote/pricing/services/pricing.service.ts",
        "./modules/crm/product-quote/pricing/services/promotion.service.ts",
        "./modules/crm/product-quote/quotes/services/quote.service.ts",
        "./modules/crm/services/AccountService.ts",
        "./modules/crm/services/CalendarIntegrationService.ts",
        "./modules/crm/services/ConversionService.ts",
        "./modules/crm/services/LeadService.ts",
        "./modules/crm/services/OpportunityService.ts",
        "./modules/crm/services/TaskAutomationService.ts",
        "./modules/feature-flags/services/FeatureFlagService.ts",
        "./modules/notifications/services/EmailService.ts",
        "./modules/users/services/OnboardingService.ts",
        "./modules/users/services/UserPreferencesService.ts",
        "./modules/roles/services/RoleService.ts"
    ]

    base_dir = "C:\\Archivos\\flexxus_flow\\backend\\src"
    os.chdir(base_dir)

    total_fixed = 0
    for file_path in files:
        if os.path.exists(file_path):
            total_fixed += fix_apperror_in_file(file_path)
        else:
            print(f"  File not found: {file_path}")

    print(f"\n[SUMMARY] Total files fixed: {total_fixed} out of {len(files)}")

if __name__ == "__main__":
    main()
