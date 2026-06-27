-- ============================================================================
-- JupyterLite Notebook Feature - Complete Setup
-- This creates tables AND seeds sample data
-- ============================================================================

-- ============================================================================
-- PART 1: Create Tables
-- ============================================================================

-- Notebook Exercises: Jupyter notebook-based learning exercises
CREATE TABLE IF NOT EXISTS public.notebook_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  notebook_content JSONB NOT NULL,
  solution_notebook JSONB,
  difficulty TEXT DEFAULT 'medium',
  topic TEXT,
  estimated_minutes INT DEFAULT 30,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_notebook_exercises_published ON public.notebook_exercises(is_published, difficulty) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_notebook_exercises_topic ON public.notebook_exercises(topic) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_notebook_exercises_created_by ON public.notebook_exercises(created_by);

-- Enable Row Level Security
ALTER TABLE public.notebook_exercises ENABLE ROW LEVEL SECURITY;

-- Policy: Published notebooks are viewable by all authenticated users
CREATE POLICY "published_notebooks_viewable_by_all"
  ON public.notebook_exercises FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Policy: Admins can manage all notebooks
CREATE POLICY "admins_manage_all_notebooks"
  ON public.notebook_exercises FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Users can view their own created notebooks
CREATE POLICY "users_view_own_notebooks"
  ON public.notebook_exercises FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================================================
-- Notebook Attempts: Track learner notebook submissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notebook_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  exercise_id UUID REFERENCES public.notebook_exercises(id) NOT NULL,
  notebook_state JSONB NOT NULL,
  passed BOOLEAN DEFAULT false,
  attempted_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_notebook_attempts_user_exercise ON public.notebook_attempts(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_notebook_attempts_exercise ON public.notebook_attempts(exercise_id);
CREATE INDEX IF NOT EXISTS idx_notebook_attempts_passed ON public.notebook_attempts(passed) WHERE passed = true;
CREATE INDEX IF NOT EXISTS idx_notebook_attempts_user ON public.notebook_attempts(user_id);

-- Enable Row Level Security
ALTER TABLE public.notebook_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notebook attempts
CREATE POLICY "users_view_own_notebook_attempts"
  ON public.notebook_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can create their own notebook attempts
CREATE POLICY "users_create_notebook_attempts"
  ON public.notebook_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all notebook attempts
CREATE POLICY "admins_view_all_notebook_attempts"
  ON public.notebook_attempts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- Helper function to update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_notebook_exercises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_notebook_exercises_updated_at_trigger ON public.notebook_exercises;
CREATE TRIGGER update_notebook_exercises_updated_at_trigger
  BEFORE UPDATE ON public.notebook_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_notebook_exercises_updated_at();

-- ============================================================================
-- PART 2: Seed Sample Notebook Exercises
-- ============================================================================

-- Insert sample notebook exercises
INSERT INTO public.notebook_exercises (id, title, description, notebook_content, difficulty, topic, estimated_minutes, is_published, created_at, updated_at) VALUES

-- 1. Hello World - Python Basics
(
  gen_random_uuid(),
  'Hello World - Python Basics',
  'Learn the fundamentals of Python programming with this introductory notebook. Perfect for beginners!',
  '{
    "nbformat": 4,
    "nbformat_minor": 0,
    "metadata": {
      "language_info": {
        "name": "python",
        "version": "3.10.0"
      },
      "kernelspec": {
        "name": "python3",
        "display_name": "Python 3",
        "language": "python"
      }
    },
    "cells": [
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
    ]
  }'::jsonb,
  'easy',
  'Python Basics',
  15,
  true,
  now(),
  now()
),

-- 2. Data Analysis with Pandas
(
  gen_random_uuid(),
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
          "    ''Product'': [''Laptop'', ''Mouse'', ''Keyboard'', ''Monitor'', ''Headphones''],\n",
          "    ''Price'': [999, 25, 75, 299, 149],\n",
          "    ''Quantity'': [10, 50, 30, 15, 40],\n",
          "    ''Category'': [''Electronics'', ''Electronics'', ''Electronics'', ''Electronics'', ''Electronics'']\n",
          "}\n",
          "\n",
          "df = pd.DataFrame(data)\n",
          "df"
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
          "df.describe()"
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
          "expensive = df[df[''Price''] > 100]\n",
          "expensive"
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
          "df[''Total_Value''] = df[''Price''] * df[''Quantity'']\n",
          "df[[''Product'', ''Total_Value'']]"
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
          "df_sorted = df.sort_values(''Total_Value'', ascending=False)\n",
          "df_sorted[[''Product'', ''Total_Value'']]"
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

-- 3. Data Visualization with Matplotlib
(
  gen_random_uuid(),
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
          "Learn to create stunning visualizations!"
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
          "# Set up the plotting environment\n",
          "plt.figure(figsize=(10, 6))\n",
          "print(\"Matplotlib ready!\")"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-3",
        "cell_type": "markdown",
        "source": [
          "## Line Plot\n",
          "\n",
          "Visualize trends over time:"
        ],
        "metadata": {}
      },
      {
        "id": "cell-4",
        "cell_type": "code",
        "source": [
          "# Generate data\n",
          "x = np.linspace(0, 10, 100)\n",
          "y1 = np.sin(x)\n",
          "y2 = np.cos(x)\n",
          "\n",
          "# Create plot\n",
          "plt.figure(figsize=(10, 5))\n",
          "plt.plot(x, y1, label=''Sin(x)'', color=''blue'')\n",
          "plt.plot(x, y2, label=''Cos(x)'', color=''red'')\n",
          "plt.xlabel(''X'')\n",
          "plt.ylabel(''Y'')\n",
          "plt.title(''Sine and Cosine Waves'')\n",
          "plt.legend()\n",
          "plt.grid(True)\n",
          "plt.show()"
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
          "categories = [''Python'', ''JavaScript'', ''Java'', ''C++'', ''Go'']\n",
          "popularity = [85, 75, 55, 40, 35]\n",
          "\n",
          "# Create bar chart\n",
          "plt.figure(figsize=(10, 5))\n",
          "plt.bar(categories, popularity, color=''steelblue'')\n",
          "plt.xlabel(''Programming Language'')\n",
          "plt.ylabel(''Popularity (%)'')\n",
          "plt.title(''Programming Language Popularity 2024'')\n",
          "plt.ylim(0, 100)\n",
          "plt.show()"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-7",
        "cell_type": "markdown",
        "source": [
          "## Scatter Plot\n",
          "\n",
          "Show relationship between two variables:"
        ],
        "metadata": {}
      },
      {
        "id": "cell-8",
        "cell_type": "code",
        "source": [
          "# Generate correlated data\n",
          "np.random.seed(42)\n",
          "study_hours = np.random.normal(5, 2, 100)\n",
          "exam_scores = 50 + study_hours * 8 + np.random.normal(0, 10, 100)\n",
          "\n",
          "# Create scatter plot\n",
          "plt.figure(figsize=(10, 6))\n",
          "plt.scatter(study_hours, exam_scores, alpha=0.6, color=''green'')\n",
          "plt.xlabel(''Hours Studied'')\n",
          "plt.ylabel(''Exam Score'')\n",
          "plt.title(''Study Hours vs Exam Score'')\n",
          "plt.grid(True)\n",
          "plt.show()"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-9",
        "cell_type": "markdown",
        "source": [
          "## Histogram\n",
          "\n",
          "Show distribution of data:"
        ],
        "metadata": {}
      },
      {
        "id": "cell-10",
        "cell_type": "code",
        "source": [
          "# Generate normal distribution\n",
          "data = np.random.normal(100, 15, 1000)\n",
          "\n",
          "# Create histogram\n",
          "plt.figure(figsize=(10, 5))\n",
          "plt.hist(data, bins=30, color=''purple'', alpha=0.7, edgecolor=''black'')\n",
          "plt.xlabel(''Value'')\n",
          "plt.ylabel(''Frequency'')\n",
          "plt.title(''Distribution of Values (Normal Distribution)'')\n",
          "plt.axvline(np.mean(data), color=''red'', linestyle=''--'', label=''Mean'')\n",
          "plt.legend()\n",
          "plt.show()"
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

-- 4. Machine Learning - Scikit-learn Basics
(
  gen_random_uuid(),
  'Machine Learning - Classification Basics',
  'Build your first ML model! Learn classification with scikit-learn and the famous Iris dataset.',
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
          "from sklearn.metrics import accuracy_score, classification_report\n",
          "import pandas as pd\n",
          "import numpy as np\n",
          "\n",
          "print(\"Scikit-learn imported successfully!\")"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-3",
        "cell_type": "markdown",
        "source": [
          "## Load the Iris Dataset\n",
          "\n",
          "A classic dataset for classification:"
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
          "df[''species''] = pd.Categorical.from_codes(iris.target, iris.target_names)\n",
          "\n",
          "# Display first few rows\n",
          "df.head()"
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
          "df[''species''].value_counts()"
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
          "## Train the Model\n",
          "\n",
          "Use a Random Forest classifier:"
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
          "print(\"Model trained successfully!\")"
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
          "\n",
          "# Detailed report\n",
          "print(\"\\nClassification Report:\")\n",
          "print(classification_report(y_test, y_pred, target_names=iris.target_names))"
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
          "print(f\"\\nMeasurements:\")\n",
          "print(f\"  Sepal Length: {new_flower[0][0]} cm\")\n",
          "print(f\"  Sepal Width: {new_flower[0][1]} cm\")\n",
          "print(f\"  Petal Length: {new_flower[0][2]} cm\")\n",
          "print(f\"  Petal Width: {new_flower[0][3]} cm\")"
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
          "# Create DataFrame for visualization\n",
          "feature_df = pd.DataFrame({\n",
          "    ''Feature'': iris.feature_names,\n",
          "    ''Importance'': importance\n",
          "}).sort_values(''Importance'', ascending=False)\n",
          "\n",
          "feature_df"
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

-- Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notebook_exercises_difficulty ON public.notebook_exercises(difficulty) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_notebook_exercises_topic_difficulty ON public.notebook_exercises(topic, difficulty) WHERE is_published = true;

-- ============================================================================
-- Complete!
-- ============================================================================
-- You should now have:
-- 1. notebook_exercises table with 4 sample notebooks
-- 2. notebook_attempts table to track user progress
-- 3. Proper RLS policies for security
-- 4. Indexes for performance
--
-- Visit /notebooks to see the sample notebooks!
-- ============================================================================
