<?php

namespace App\Http\Requests\Projects;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @method \App\Models\User user()
 */
class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'start_baseline' => ['nullable', 'date'],
            'hierarchy_file' => [
                'required',
                'file',
                'max:204800',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $extension = strtolower((string) $value?->getClientOriginalExtension());

                    if (! in_array($extension, ['mpp', 'csv', 'txt'], true)) {
                        $fail('The hierarchy file field must be a file of type: mpp, csv, txt.');
                    }
                },
            ],
            'train_non_rl' => ['nullable', 'boolean'],
            'train_dqn' => ['nullable', 'boolean'],
            'train_ppo' => ['nullable', 'boolean'],
        ];
    }
}
