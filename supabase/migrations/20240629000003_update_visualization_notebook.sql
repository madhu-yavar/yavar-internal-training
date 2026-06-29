-- ============================================================================
-- Update Visualization Notebook - Use plt.show() for plot display
-- ============================================================================

-- Delete and recreate the visualization notebook with proper plot calls
DELETE FROM public.notebook_exercises WHERE title = 'Data Visualization - Plotting Basics';

INSERT INTO public.notebook_exercises (id, title, description, notebook_content, difficulty, topic, estimated_minutes, is_published, created_at, updated_at) VALUES
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
          "Plots will be displayed as images in the notebook!"
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
          "## Line Plot\n",
          "\n",
          "Create a sine and cosine wave plot:"
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
          "plt.plot(x, y1, label=\"Sin(x)\", color=\"blue\")\n",
          "plt.plot(x, y2, label=\"Cos(x)\", color=\"red\")\n",
          "plt.xlabel(\"X\")\n",
          "plt.ylabel(\"Y\")\n",
          "plt.title(\"Sine and Cosine Waves\")\n",
          "plt.legend()\n",
          "plt.grid(True)\n",
          "\n",
          "# Display the plot\n",
          "plt.show()\n",
          "\n",
          "print(\"Line plot created!\")"
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
          "Compare programming language popularity:"
        ],
        "metadata": {}
      },
      {
        "id": "cell-6",
        "cell_type": "code",
        "source": [
          "# Sample data\n",
          "categories = [\"Python\", \"JavaScript\", \"Java\", \"C++\", \"Go\"]\n",
          "popularity = [85, 75, 55, 40, 35]\n",
          "\n",
          "# Create bar chart\n",
          "plt.figure(figsize=(10, 5))\n",
          "plt.bar(categories, popularity, color=\"steelblue\")\n",
          "plt.xlabel(\"Programming Language\")\n",
          "plt.ylabel(\"Popularity (%)\")\n",
          "plt.title(\"Programming Language Popularity 2024\")\n",
          "plt.ylim(0, 100)\n",
          "\n",
          "# Display the plot\n",
          "plt.show()\n",
          "\n",
          "print(f\"Bar chart with {len(categories)} languages\")"
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
          "Show the relationship between study hours and exam scores:"
        ],
        "metadata": {}
      },
      {
        "id": "cell-8",
        "cell_type": "code",
        "source": [
          "# Generate correlated data\n",
          "np.random.seed(42)\n",
          "study_hours = np.random.normal(5, 2, 50)\n",
          "exam_scores = 50 + study_hours * 8 + np.random.normal(0, 10, 50)\n",
          "\n",
          "# Create scatter plot\n",
          "plt.figure(figsize=(10, 6))\n",
          "plt.scatter(study_hours, exam_scores, alpha=0.6, color=\"green\", s=50)\n",
          "plt.xlabel(\"Hours Studied\")\n",
          "plt.ylabel(\"Exam Score\")\n",
          "plt.title(\"Study Hours vs Exam Score\")\n",
          "plt.grid(True)\n",
          "\n",
          "# Display the plot\n",
          "plt.show()\n",
          "\n",
          "print(f\"Scatter plot with {len(study_hours)} data points\")"
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
          "Show the distribution of exam scores:"
        ],
        "metadata": {}
      },
      {
        "id": "cell-10",
        "cell_type": "code",
        "source": [
          "# Generate normal distribution\n",
          "data = np.random.normal(75, 15, 100)\n",
          "\n",
          "# Create histogram\n",
          "plt.figure(figsize=(10, 5))\n",
          "plt.hist(data, bins=20, color=\"purple\", alpha=0.7, edgecolor=\"black\")\n",
          "plt.xlabel(\"Exam Score\")\n",
          "plt.ylabel(\"Frequency\")\n",
          "plt.title(\"Distribution of Exam Scores\")\n",
          "plt.axvline(np.mean(data), color=\"red\", linestyle=\"--\", linewidth=2, label=\"Mean\")\n",
          "plt.legend()\n",
          "\n",
          "# Display the plot\n",
          "plt.show()\n",
          "\n",
          "print(f\"Histogram of {len(data)} exam scores\")\n",
          "print(f\"Mean score: {np.mean(data):.1f}\")\n",
          "print(f\"Std deviation: {np.std(data):.1f}\")"
        ],
        "execution_count": null,
        "outputs": [],
        "metadata": {}
      },
      {
        "id": "cell-11",
        "cell_type": "markdown",
        "source": [
          "## Try It Yourself!\n",
          "\n",
          "Create your own plot:"
        ],
        "metadata": {}
      },
      {
        "id": "cell-12",
        "cell_type": "code",
        "source": [
          "# Your custom plot here\n",
          "x = [1, 2, 3, 4, 5]\n",
          "y = [2, 4, 6, 8, 10]\n",
          "\n",
          "plt.figure(figsize=(8, 4))\n",
          "plt.plot(x, y, marker=\"o\", linewidth=2)\n",
          "plt.xlabel(\"X Axis\")\n",
          "plt.ylabel(\"Y Axis\")\n",
          "plt.title(\"My Custom Plot\")\n",
          "plt.grid(True)\n",
          "plt.show()\n",
          "\n",
          "print(\"Your plot is ready!\")"
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
)
ON CONFLICT (id) DO NOTHING;
