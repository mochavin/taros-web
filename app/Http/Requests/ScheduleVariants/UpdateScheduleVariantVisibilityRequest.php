<?php

namespace App\Http\Requests\ScheduleVariants;

use Illuminate\Foundation\Http\FormRequest;

class UpdateScheduleVariantVisibilityRequest extends FormRequest
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
        return [
            'is_hidden' => ['required', 'boolean'],
        ];
    }
}
