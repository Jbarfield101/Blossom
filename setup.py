from setuptools import setup, find_packages

setup(
    name='blossom-audio',
    version='0.1.8',
    packages=find_packages(where="src-tauri/python"),
    package_dir={"": "src-tauri/python"},
    py_modules=["summarize_session"],
    entry_points={
        "console_scripts": ["summarize-session=summarize_session:main"],
    },
    install_requires=[
        'scipy>=1.9.0',
        'pyloudnorm>=0.1.0',
        'numpy>=1.21.0',
        'pydub>=0.25.0',
        'pdfplumber>=0.10.3',
    ],
    python_requires='>=3.10',
)
