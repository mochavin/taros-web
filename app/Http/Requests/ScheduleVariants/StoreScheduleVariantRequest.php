<?php

namespace App\Http\Requests\ScheduleVariants;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\Rule;

class StoreScheduleVariantRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $projectParameter = Route::current()?->parameter('project');
        $projectId = $projectParameter instanceof Project ? $projectParameter->getKey() : $projectParameter;

        $slugRule = Rule::unique('schedule_variants', 'slug');

        if ($projectId) {
            $slugRule = $slugRule->where(fn ($query) => $query->where('project_id', $projectId));
        }

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'required',
                'string',
                'max:255',
                $slugRule,
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_default' => ['nullable', 'boolean'],
            'task_file' => ['required', 'file', 'mimes:csv,txt'],
            'resource_file' => ['required', 'file', 'mimes:csv,txt'],
        ];
    }
}
