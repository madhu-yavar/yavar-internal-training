-- ============================================================================
-- Fix Notebook Outputs - Add proper print statements
-- ============================================================================

-- Update Data Analysis notebook
UPDATE public.notebook_exercises
SET notebook_content = notebook_content || '{"cells": [
  {
    "id": "cell-1",
    "cell_type": "markdown",
    "source": [
      "# Welcome to Python! \n",
      "\n",
      "This notebook will introduce you to Python basics. Let''s start with the classic \"Hello World!\""
    ],
    "metadata": {}
  },
  {
    "id": "cell-2",
    "cell_type": "code",
    "source": [
      "# Your first Python code\n",
      "print(\"Hello, World!\")\n",
      "print(\"Welcome to Notebook Labs!\")"
    ],
    "execution_count": null,
    "outputs": [],
    "metadata": {}
  },
  {
    "id": "cell-3",
    "cell_type": "markdown",
    "source": [
      "## Variables and Data Types\n",
      "\n",
      "Python can store different types of data:"
    ],
    "metadata": {}
  },
  {
    "id": "cell-4",
    "cell_type": "code",
    "source": [
      "# String\n",
      "name = \"Python Learner\"\n",
      "print(f\"Hello, {name}!\")\n",
      "\n",
      "# Integer\n",
      "age = 25\n",
      "print(f\"Age: {age}\")\n",
      "\n",
      "# Float\n",
      "height = 5.9\n",
      "print(f\"Height: {height} feet\")\n",
      "\n",
      "# Boolean\n",
      "is_learning = True\n",
      "print(f\"Learning: {is_learning}\")"
    ],
    "execution_count": null,
    "outputs": [],
    "metadata": {}
  },
  {
    "id": "cell-5",
    "cell_type": "markdown",
    "source": [
      "## Lists and Loops\n",
      "\n",
      "Lists let you store multiple items:"
    ],
    "metadata": {}
  },
  {
    "id": "cell-6",
    "cell_type": "code",
    "source": [
      "# Create a list\n",
      "fruits = [\"apple\", \"banana\", \"cherry\"]\n",
      "\n",
      "# Loop through the list\n",
      "for fruit in fruits:\n",
      "    print(f\"I like {fruit}\")"
    ],
    "execution_count": null,
    "outputs": [],
    "metadata": {}
  },
  {
    "id": "cell-7",
    "cell_type": "markdown",
    "source": [
      "## Try It Yourself!\n",
      "\n",
      "Modify the code below to print your own message:"
    ],
    "metadata": {}
  },
  {
    "id": "cell-8",
    "cell_type": "code",
    "source": [
      "# TODO: Change this message\n",
      "your_message = \"I''m learning Python!\"\n",
      "\n",
      "print(your_message)\n",
      "print(f\"Times 3: {your_message} \" * 3)"
    ],
    "execution_count": null,
    "outputs": [],
    "metadata": {}
  }
]}'::jsonb
WHERE title = 'Hello World - Python Basics';

-- Delete old notebooks and insert fixed versions
DELETE FROM public.notebook_exercises WHERE difficulty IN ('medium', 'hard');

-- Insert fixed Data Analysis notebook
INSERT INTO public.notebook_exercises (id, title, description, notebook_content, difficulty, topic, estimated_minutes, is_published, created_at, updated_at) VALUES
(
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Data Analysis - Pandas Basics',
  'Learn to analyze data using pandas. Load data, filter, group, and gain insights!',
  '{
    "nbformat": 4,
    "nbformat_minor": 0,
    "metadata": {
      "language_info": {
        "name": "python",
        "version": "3.10.0"
      }
    },
    "cells": [
      {
        "id": "cell-1",
        "cell_type": "markdown",
        "source": [
          "# Data Analysis with Pandas\n",
          "\n",
          "Learn to analyze and manipulate data using pandas!"
        ],
        "metadata": {}
      },
      {
        "id": "cell-2",
        "cell_type": "code",
        "source": [
          "import pandas as pd\n",
          "import numpy as np\n",
          "\n",
          "print(\"Pandas version:\", pd.__version__)"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-3",
        "cell_type": "markdown",
        "source": [
          "## Creating a DataFrame\n",
          "\n",
          "Let''s create some sample data to work with:"
        ],
        "metadata": {}
      },
      {
        "id": "cell-4",
        "cell_type": "code",
        "source": [
          "# Create sample sales data\n",
          "data = {\n",
          "    \"Product\": [\"Laptop\", \"Mouse\", \"Keyboard\", \"Monitor\", \"Headphones\"],\n",
          "    \"Price\": [999, 25, 75, 299, 149],\n",
          "    \"Quantity\": [10, 50, 30, 15, 40],\n",
          "    \"Category\": [\"Electronics\", \"Electronics\", \"Electronics\", \"Electronics\", \"Electronics\"]\n",
          "}\n",
          "\n",
          "df = pd.DataFrame(data)\n",
          "print(df)"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-5",
        "cell_type": "markdown",
        "source": [
          "## Basic Statistics"
        ],
        "metadata": {}
      },
      {
        "id": "cell-6",
        "cell_type": "code",
        "source": [
          "# Get summary statistics\n",
          "print(df.describe())"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-7",
        "cell_type": "markdown",
        "source": [
          "## Filtering Data\n",
          "\n",
          "Find products that cost more than $100:"
        ],
        "metadata": {}
      },
      {
        "id": "cell-8",
        "cell_type": "code",
        "source": [
          "# Filter expensive items\n",
          "expensive = df[df[\"Price\"] > 100]\n",
          "print(\"Products over $100:\")\n",
          "print(expensive[[\"Product\", \"Price\"]])"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-9",
        "cell_type": "markdown",
        "source": [
          "## Calculated Columns\n",
          "\n",
          "Add a total value column:"
        ],
        "metadata": {}
      },
      {
        "id": "cell-10",
        "cell_type": "code",
        "source": [
          "# Calculate total value\n",
          "df[\"Total_Value\"] = df[\"Price\"] * df[\"Quantity\"]\n",
          "print(\"DataFrame with Total Value:\")\n",
          "print(df[[\"Product\", \"Price\", \"Quantity\", \"Total_Value\"]])"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-11",
        "cell_type": "markdown",
        "source": [
          "## Sorting Data\n",
          "\n",
          "Sort by total value:"
        ],
        "metadata": {}
      },
      {
        "id": "cell-12",
        "cell_type": "code",
        "source": [
          "# Sort by total value (descending)\n",
          "df_sorted = df.sort_values(\"Total_Value\", ascending=False)\n",
          "print(\"Products sorted by value:\")\n",
          "print(df_sorted[[\"Product\", \"Total_Value\"]])"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      }
    ]
  }'::jsonb,
  'medium',
  'Data Analysis',
  25,
  true,
  now(),
  now()
),
(
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'Data Visualization - Plotting Basics',
  'Create beautiful charts and graphs with matplotlib. Visualize your data effectively!',
  '{
    "nbformat": 4,
    "nbformat_minor": 0,
    "metadata": {
      "language_info": {
        "name": "python",
        "version": "3.10.0"
      }
    },
    "cells": [
      {
        "id": "cell-1",
        "cell_type": "markdown",
        "source": [
          "# Data Visualization with Matplotlib\n",
          "\n",
          "Note: Plots are displayed as SVG images in the browser."
        ],
        "metadata": {}
      },
      {
        "id": "cell-2",
        "cell_type": "code",
        "source": [
          "import matplotlib.pyplot as plt\n",
          "import numpy as np\n",
          "\n",
          "print(\"Matplotlib loaded successfully!\")"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-3",
        "cell_type": "markdown",
        "source": [
          "## Simple Plot\n",
          "\n",
          "Let''s create a simple line plot:"
        ],
        "metadata": {}
      },
      {
        "id": "cell-4",
        "cell_type": "code",
        "source": [
          "# Create data\n",
          "x = [1, 2, 3, 4, 5]\n",
          "y = [2, 4, 6, 8, 10]\n",
          "\n",
          "# Create plot\n",
          "plt.figure(figsize=(8, 4))\n",
          "plt.plot(x, y, marker=\"o\")\n",
          "plt.xlabel(\"X Axis\")\n",
          "plt.ylabel(\"Y Axis\")\n",
          "plt.title(\"Simple Line Plot\")\n",
          "plt.grid(True)\n",
          "\n",
          "# Save to SVG string for display\n",
          "import io\n",
          "buf = io.BytesIO()\n",
          "plt.savefig(buf, format=\"svg\")\n",
          "buf.seek(0)\n",
          "svg_data = buf.read().decode(\"utf-8\")\n",
          "print(f\"Plot created! (SVG length: {len(svg_data)} characters)\")\n",
          "plt.close()"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-5",
        "cell_type": "markdown",
        "source": [
          "## Bar Chart\n",
          "\n",
          "Compare categories:"
        ],
        "metadata": {}
      },
      {
        "id": "cell-6",
        "cell_type": "code",
        "source": [
          "# Sample data\n",
          "categories = [\"Python\", \"JavaScript\", \"Java\", \"C++\", \"Go\"]\n",
          "values = [85, 75, 55, 40, 35]\n",
          "\n",
          "# Create bar chart\n",
          "plt.figure(figsize=(10, 5))\n",
          "plt.bar(categories, values, color=\"steelblue\")\n",
          "plt.xlabel(\"Programming Language\")\n",
          "plt.ylabel(\"Popularity (%)\")\n",
          "plt.title(\"Programming Language Popularity 2024\")\n",
          "plt.ylim(0, 100)\n",
          "\n",
          "# Count plot elements\n",
          "print(f\"Bar chart with {len(categories)} categories\")\n",
          "print(f\"Values: {values}\")\n",
          "plt.close()"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-7",
        "cell_type": "markdown",
        "source": [
          "## Working with Data\n",
          "\n",
          "Let''s generate and analyze some random data:"
        ],
        "metadata": {}
      },
      {
        "id": "cell-8",
        "cell_type": "code",
        "source": [
          "# Generate random data\n",
          "np.random.seed(42)\n",
          "data = np.random.randn(100)\n",
          "\n",
          "print(f\"Generated {len(data)} random numbers\")\n",
          "print(f\"Mean: {np.mean(data):.2f}\")\n",
          "print(f\"Std Dev: {np.std(data):.2f}\")\n",
          "print(f\"Min: {np.min(data):.2f}\")\n",
          "print(f\"Max: {np.max(data):.2f}\")"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      }
    ]
  }'::jsonb,
  'medium',
  'Data Visualization',
  30,
  true,
  now(),
  now()
),
(
  'd4e5f6a7-b8c9-0123-def0-234567890123',
  'Machine Learning - Classification Basics',
  'Build your first ML model! Learn classification with scikit-learn.',
  '{
    "nbformat": 4,
    "nbformat_minor": 0,
    "metadata": {
      "language_info": {
        "name": "python",
        "version": "3.10.0"
      }
    },
    "cells": [
      {
        "id": "cell-1",
        "cell_type": "markdown",
        "source": [
          "# Machine Learning - Classification\n",
          "\n",
          "Build a classifier using scikit-learn!"
        ],
        "metadata": {}
      },
      {
        "id": "cell-2",
        "cell_type": "code",
        "source": [
          "from sklearn.datasets import load_iris\n",
          "from sklearn.model_selection import train_test_split\n",
          "from sklearn.ensemble import RandomForestClassifier\n",
          "from sklearn.metrics import accuracy_score\n",
          "import pandas as pd\n",
          "import numpy as np\n",
          "\n",
          "print(\"Scikit-learn loaded successfully!\")"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-3",
        "cell_type": "markdown",
        "source": [
          "## Load the Iris Dataset"
        ],
        "metadata": {}
      },
      {
        "id": "cell-4",
        "cell_type": "code",
        "source": [
          "# Load dataset\n",
          "iris = load_iris()\n",
          "\n",
          "# Create DataFrame\n",
          "df = pd.DataFrame(data=iris.data, columns=iris.feature_names)\n",
          "df[\"species\"] = pd.Categorical.from_codes(iris.target, iris.target_names)\n",
          "\n",
          "print(\"Iris Dataset:\")\n",
          "print(df.head(10))"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-5",
        "cell_type": "markdown",
        "source": [
          "## Explore the Data"
        ],
        "metadata": {}
      },
      {
        "id": "cell-6",
        "cell_type": "code",
        "source": [
          "# Show species distribution\n",
          "print(\"Species distribution:\")\n",
          "print(df[\"species\"].value_counts())\n",
          "print()\n",
          "print(\"Feature statistics:\")\n",
          "print(df.describe())"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-7",
        "cell_type": "markdown",
        "source": [
          "## Split Data\n",
          "\n",
          "Separate into training and testing sets:"
        ],
        "metadata": {}
      },
      {
        "id": "cell-8",
        "cell_type": "code",
        "source": [
          "# Split features and target\n",
          "X = iris.data\n",
          "y = iris.target\n",
          "\n",
          "# Split into train and test\n",
          "X_train, X_test, y_train, y_test = train_test_split(\n",
          "    X, y, test_size=0.2, random_state=42\n",
          ")\n",
          "\n",
          "print(f\"Training samples: {len(X_train)}\")\n",
          "print(f\"Testing samples: {len(X_test)}\")"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-9",
        "cell_type": "markdown",
        "source": [
          "## Train the Model"
        ],
        "metadata": {}
      },
      {
        "id": "cell-10",
        "cell_type": "code",
        "source": [
          "# Create and train model\n",
          "model = RandomForestClassifier(n_estimators=100, random_state=42)\n",
          "model.fit(X_train, y_train)\n",
          "\n",
          "print(\"Model trained successfully!\")\n",
          "print(f\"Using {model.n_estimators} trees\")"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-11",
        "cell_type": "markdown",
        "source": [
          "## Evaluate the Model"
        ],
        "metadata": {}
      },
      {
        "id": "cell-12",
        "cell_type": "code",
        "source": [
          "# Make predictions\n",
          "y_pred = model.predict(X_test)\n",
          "\n",
          "# Calculate accuracy\n",
          "accuracy = accuracy_score(y_test, y_pred)\n",
          "print(f\"Accuracy: {accuracy:.2%}\")\n",
          "print()\n",
          "print(\"Sample predictions (first 5):\")\n",
          "for i in range(5):\n",
          "    actual = iris.target_names[y_test[i]]\n",
          "    predicted = iris.target_names[y_pred[i]]\n",
          "    print(f\"  Actual: {actual:8s} | Predicted: {predicted:8s}\")"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-13",
        "cell_type": "markdown",
        "source": [
          "## Make Predictions\n",
          "\n",
          "Try predicting on new data:"
        ],
        "metadata": {}
      },
      {
        "id": "cell-14",
        "cell_type": "code",
        "source": [
          "# New sample (sepal length, sepal width, petal length, petal width)\n",
          "new_flower = [[5.1, 3.5, 1.4, 0.2]]\n",
          "\n",
          "# Predict\n",
          "prediction = model.predict(new_flower)\n",
          "predicted_species = iris.target_names[prediction[0]]\n",
          "\n",
          "print(f\"Predicted species: {predicted_species}\")\n",
          "print()\n",
          "print(\"Input measurements:\")\n",
          "print(f\"  Sepal Length: {new_flower[0][0]} cm\")\n",
          "print(f\"  Sepal Width:  {new_flower[0][1]} cm\")\n",
          "print(f\"  Petal Length: {new_flower[0][2]} cm\")\n",
          "print(f\"  Petal Width:  {new_flower[0][3]} cm\")"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-15",
        "cell_type": "markdown",
        "source": [
          "## Feature Importance\n",
          "\n",
          "Which features were most important:"
        ],
        "metadata": {}
      },
      {
        "id": "cell-16",
        "cell_type": "code",
        "source": [
          "# Get feature importance\n",
          "importance = model.feature_importances_\n",
          "\n",
          "print(\"Feature Importance:\")\n",
          "for feature, imp in zip(iris.feature_names, importance):\n",
          "    print(f\"  {feature}: {imp:.3f}\")"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      }
    ]
  }'::jsonb,
  'hard',
  'Machine Learning',
  40,
  true,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;
