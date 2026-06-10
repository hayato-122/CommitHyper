import { signIn } from "@/auth"

export default function LoginPage() {
  return (
    <div>
      <h1>CommitHyper</h1>
      <p>GitHubのコミットメッセージを改善して、開発力を上げよう</p>
      <form
        action={async () => {
          "use server"
          await signIn("github")
        }}
      >
        <button type="submit">
          GitHubでログイン
        </button>
      </form>
    </div>
  )
}
