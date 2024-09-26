from flask import Flask, render_template, request

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/rename', methods=['POST'])
def rename():
    files = request.files.getlist('files')
    pass


if __name__ == '__main__':
    app.run(debug=True)