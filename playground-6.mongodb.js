// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("test");

// position이 "employee"인 모든 사용자 삭제
db.getCollection("signupusers").deleteMany({
    position: "employee"
}); 