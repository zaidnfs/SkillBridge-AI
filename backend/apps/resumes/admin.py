from django.contrib import admin
from .models import Resume


@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "original_filename",
        "file_type",
        "file_size",
        "is_parsed",
        "created_at",
    )
    list_filter = ("file_type", "is_parsed", "created_at")
    search_fields = ("original_filename", "user__email", "extracted_text")
    readonly_fields = ("id", "created_at", "updated_at", "parsed_at")
