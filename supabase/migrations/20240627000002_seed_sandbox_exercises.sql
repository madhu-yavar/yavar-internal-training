-- ============================================================================
-- Seed Data: Python Sandbox Exercises
-- ============================================================================

-- Insert 5 beginner-friendly Python exercises (with explicit IDs for conflict detection)
INSERT INTO public.sandbox_exercises (id, title, description, instructions, starter_code, solution_code, test_cases, hints, difficulty, topic, estimated_minutes, is_published)
VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Hello World',
    'Your first Python program! Print a classic greeting.',
    'Use the `print()` function to output exactly "Hello, World!" (without quotes).',
    '# Write your code here\nprint(___)',
    'print("Hello, World!")',
    '[
      {
        "description": "Prints Hello World",
        "input": "",
        "expected_output": "Hello, World!"
      }
    ]'::jsonb,
    '[]'::jsonb,
    'easy',
    'basics',
    5,
    true
  ),
  (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Variables & Math: Rectangle Area',
    'Calculate the area of a rectangle using variables and arithmetic.',
    'Create variables for width and height, then calculate area = width × height. Print the result.',
    '# Write your code here
# Define width and height
width = 10
height = 5

# Calculate area
area = ___

# Print the result
print(area)',
    'width = 10
height = 5
area = width * height
print(area)',
    '[
      {
        "description": "Calculates area correctly",
        "input": "width = 10\nheight = 5\narea = width * height\nprint(area)",
        "expected_output": "50"
      }
    ]'::jsonb,
    '[{"hint": "Use the * operator for multiplication."}, {"hint": "area = width * height"}]'::jsonb,
    'easy',
    'basics',
    10,
    true
  ),
  (
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'Conditionals: Even or Odd',
    'Determine if a number is even or odd using if/else statements.',
    'Write a function that checks if a number is even or odd. A number is even if divisible by 2.',
    '# Write your code here
def is_even(number):
    # Your code here
    pass

# Test
print(is_even(4))  # Should print: True
print(is_even(7))  # Should print: False',
    'def is_even(number):
    return number % 2 == 0

print(is_even(4))
print(is_even(7))',
    '[
      {
        "description": "Returns True for even numbers",
        "input": "def is_even(number):\n    return number % 2 == 0\nprint(is_even(4))",
        "expected_output": "True"
      },
      {
        "description": "Returns False for odd numbers",
        "input": "def is_even(number):\n    return number % 2 == 0\nprint(is_even(7))",
        "expected_output": "False"
      }
    ]'::jsonb,
    '[{"hint": "Use the modulo operator % to find remainder"}, {"hint": "number % 2 == 0 means the number is even"}]'::jsonb,
    'easy',
    'basics',
    15,
    true
  ),
  (
    'd4e5f6a7-b8c9-0123-def0-234567890123',
    'Loops: Sum a List',
    'Calculate the sum of all numbers in a list using a loop.',
    'Use a for loop to iterate through the list and accumulate the sum.',
    '# Write your code here
numbers = [1, 2, 3, 4, 5]

# Your code here
total = 0

# Add each number to total


# Print the result
print(total)  # Should print: 15',
    'numbers = [1, 2, 3, 4, 5]
total = 0
for num in numbers:
    total += num
print(total)',
    '[
      {
        "description": "Sums list correctly",
        "input": "numbers = [1, 2, 3, 4, 5]\ntotal = 0\nfor num in numbers:\n    total += num\nprint(total)",
        "expected_output": "15"
      }
    ]'::jsonb,
    '[{"hint": "Use a for loop: for num in numbers:"}, {"hint": "Add to total: total += num"}]'::jsonb,
    'medium',
    'basics',
    15,
    true
  ),
  (
    'e5f6a7b8-c9d0-1234-ef01-345678901234',
    'Functions: Factorial',
    'Calculate the factorial of a number using recursion or loops.',
    'Factorial of n (written n!) is the product of all positive integers up to n. Example: 5! = 5 × 4 × 3 × 2 × 1 = 120',
    '# Write your code here
def factorial(n):
    # Your code here
    pass

# Test
print(factorial(5))  # Should print: 120
print(factorial(3))  # Should print: 6',
    'def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))
print(factorial(3))',
    '[
      {
        "description": "Calculates factorial of 5",
        "input": "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\nprint(factorial(5))",
        "expected_output": "120"
      },
      {
        "description": "Calculates factorial of 3",
        "input": "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\nprint(factorial(3))",
        "expected_output": "6"
      },
      {
        "description": "Factorial of 0 is 1",
        "input": "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\nprint(factorial(0))",
        "expected_output": "1"
      }
    ]'::jsonb,
    '[{"hint": "Base case: factorial(0) = 1 or factorial(1) = 1"}, {"hint": "Recursive case: n! = n × (n-1)!"}, {"hint": "You can also use a loop instead of recursion"}]'::jsonb,
    'medium',
    'basics',
    20,
    true
  )
ON CONFLICT DO NOTHING;
