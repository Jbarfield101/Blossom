from setuptools import setup, find_packages

setup(
    name='blossom-audio',
    version='0.1.8',
    packages=find_packages(where="src-tauri/python"),
    package_dir={"": "src-tauri/python"},
    install_requires=[
        'scipy>=1.9.0',
        'pyloudnorm>=0.1.0',
        'numpy>=1.21.0',
        'pydub>=0.25.0',
        'gTTS>=2.5.1',
        'audioop-lts; python_version >= "3.13"',
    ],
)
